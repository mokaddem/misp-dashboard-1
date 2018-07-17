function easyWidgetInsert(container, config) {
    if (container == undefined) {
        console.log('No container supplied');
    }
    var jContainer = $('#'+container);

    var heading = jContainer.parent().find('.panel-heading');
    if (config.name !== undefined) {
        heading.text(config.name);
    } else { // no name, remove widget
        heading.remove();
    }

    var body = jContainer.parent().find('.panel-body');
    if (config.fitContent !== undefined && config.fitContent) {
        body.css('padding', '0px');
    } else { // check whether to make the panel body fit the content or not based on the widget type
        switch (config.type) {
            case 'led':
                break;
            default:
                body.css('padding', '0px');
        }
    }

    var widget_endpoint = '/widget/' + config.type + '/';

    $.ajax({
        url: widget_endpoint,
        data: config,
        success: function(html) {
            jContainer.html(html);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            jContainer.append(textStatus+': '+errorThrown);
        },
        beforeSend: function() {
            // console.log(jContainer);
        },
        complete: function() {
            // console.log(jContainer);
        }
    });
}

// function easyWidgetInsert_OLD(container, config) {
//     var endpoint = config.endpoint;
//     var endpoint_data = config.endpoint_data !== undefined ? config.endpoint_data : {};
//     container = config.container !== undefined ? config.container : container;
//     if (container == undefined) {
//         console.log('No container supplied');
//     }
//     var jContainer = $('#'+container);
//
//     var heading = jContainer.parent().find('.panel-heading');
//     if (config.name !== undefined) {
//         heading.text(config.name);
//     } else { // no name, remove widget
//         heading.remove();
//     }
//
//     $.ajax({
//         dataType: "json",
//         url: endpoint,
//         data: endpoint_data,
//         success: function(html) {
//             jContainer.text(JSON.stringify(html));
//         },
//         error: function(jqXHR, textStatus, errorThrown) {
//             jContainer.append(textStatus);
//         },
//         beforeSend: function() {
//             // console.log(jContainer);
//         },
//         complete: function() {
//             // console.log(jContainer);
//         }
//     });
// }
