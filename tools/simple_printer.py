#!/usr/bin/env python3.5


import zmq
import json
from pprint import pprint

ZMQ_URL = "tcp://192.168.56.50:50000"

def main():
    context = zmq.Context()
    socket = context.socket(zmq.SUB)
    socket.connect(ZMQ_URL)
    socket.setsockopt_string(zmq.SUBSCRIBE, '')

    while True:
        content = socket.recv()
        content.replace(b'\n', b'') # remove \n...
        toP = content.decode('utf8')
        toP = toP[toP.index(' '):]
        pprint(json.loads(toP))

main()
