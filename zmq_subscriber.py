#!/usr/bin/env python3.5

import time, datetime
import zmq
import redis
import random
import configparser
import argparse
import os
import sys
import json
import geoip2.database

configfile = os.path.join(os.environ['VIRTUAL_ENV'], '../config.cfg')
cfg = configparser.ConfigParser()
cfg.read(configfile)

ZMQ_URL = cfg.get('RedisLog', 'zmq_url')
CHANNEL = cfg.get('RedisLog', 'channel')
CHANNELDISP = cfg.get('RedisMap', 'channelDisp')
CHANNEL_PROC = cfg.get('RedisMap', 'channelProc')
PATH_TO_DB = cfg.get('RedisMap', 'pathMaxMindDB')

redis_server = redis.StrictRedis(
        host=cfg.get('RedisLog', 'host'),
        port=cfg.getint('RedisLog', 'port'),
        db=cfg.getint('RedisLog', 'db'))
serv_coord = redis.StrictRedis(
        host=cfg.get('RedisMap', 'host'),
        port=cfg.getint('RedisMap', 'port'),
        db=cfg.getint('RedisMap', 'db'))

reader = geoip2.database.Reader(PATH_TO_DB)


def publish_log(zmq_name, name, content):
    to_send = { 'name': name, 'log': json.dumps(content), 'zmqName': zmq_name }
    redis_server.publish(CHANNEL, json.dumps(to_send))


def ip_to_coord(ip):
    resp = reader.city(ip)
    lat = float(resp.location.latitude)
    lon = float(resp.location.longitude)
    # 0.0001 correspond to ~10m
    # Cast the float so that it has the correct float format
    lat_corrected = float("{:.4f}".format(lat))
    lon_corrected = float("{:.4f}".format(lon))
    return { 'coord': {'lat': lat_corrected, 'lon': lon_corrected}, 'full_rep': resp }

def getCoordAndPublish(zmq_name, supposed_ip, categ):
    try:
        rep = ip_to_coord(supposed_ip)
        coord = rep['coord']
        coord_dic = {'lat': coord['lat'], 'lon': coord['lon']}
        coord_list = [coord['lat'], coord['lon']]
        now = datetime.datetime.now()
        today_str = str(now.year)+str(now.month)+str(now.day)
        keyname = 'GEO_' + today_str
        serv_coord.zincrby(keyname, coord_list)
        to_send = {
                "coord": coord,
                "categ": categ,
                "value": supposed_ip,
                "country": rep['full_rep'].country.name,
                "specifName": rep['full_rep'].subdivisions.most_specific.name,
                "cityName": rep['full_rep'].city.name,
                "regionCode": rep['full_rep'].country.iso_code,
                }
        serv_coord.publish(CHANNELDISP, json.dumps(to_send))
    except ValueError:
        print("can't resolve ip")

##############
## HANDLERS ##
##############

def handler_log(zmq_name, jsonevent):
    print('sending', 'log')
    return

def handler_keepalive(zmq_name, jsonevent):
    print('sending', 'keepalive')
    to_push = [ jsonevent['uptime'] ]
    publish_log(zmq_name, 'Keepalive', to_push)

def handler_event(zmq_name, jsonevent):
    #print(jsonevent)
    #fields: threat_level_id, id, info
    jsonevent = jsonevent['Event']
    #redirect to handler_attribute
    if 'Attribute' in jsonevent:
        attributes = jsonevent['Attribute']
        print("+--------- EVENTS -----------+")
        print(attributes)
        if attributes is list:
            for attr in attributes:
                handler_attribute(zmq_name, attr)
        else:
            handler_attribute(zmq_name, jsonevent)


def handler_attribute(zmq_name, jsonattr):
    print("+--------- ATTRIBUTE -----------+")
    jsonattr = jsonattr['Attribute']
    print(jsonattr)
    to_push = []
    for field in json.loads(cfg.get('Log', 'fieldname_order')):
        print(field)
        if type(field) is list:
            to_add = cfg.get('Log', 'char_separator').join([ jsonattr[subField] for subField in field ])
        else:
            to_add = jsonattr[field]
        to_push.append(to_add)

    #try to get coord
    if jsonattr['category'] == "Network activity":
        getCoordAndPublish(zmq_name, jsonattr['value'], jsonattr['category'])

    publish_log(zmq_name, 'Attribute', to_push)


def process_log(zmq_name, event):
    event = event.decode('utf8')
    topic, eventdata = event.split(' ', maxsplit=1)
    jsonevent = json.loads(eventdata)
    dico_action[topic](zmq_name, jsonevent)


def main(zmqName):
    context = zmq.Context()
    socket = context.socket(zmq.SUB)
    socket.connect(ZMQ_URL)
    socket.setsockopt_string(zmq.SUBSCRIBE, '')

    while True:
        content = socket.recv()
        content.replace(b'\n', b'') # remove \n...
        zmq_name = zmqName
        process_log(zmq_name, content)


dico_action = {
        "misp_json":                handler_event,
        "misp_json_self":           handler_keepalive,
        "misp_json_attribute":      handler_attribute,
        "misp_json_sighting":       handler_log,
        "misp_json_organisation":   handler_log,
        "misp_json_user":           handler_log,
        "misp_json_conversation":   handler_log
        }


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='A zmq subscriber. It subscribe to a ZNQ then redispatch it to the misp-dashboard')
    parser.add_argument('-n', '--name', required=False, dest='zmqname', help='The ZMQ feed name', default="Misp Standard ZMQ")
    parser.add_argument('-u', '--url', required=False, dest='zmqurl', help='The URL to connect to', default=ZMQ_URL)
    args = parser.parse_args()

    main(args.zmqname)
    reader.close()

