/*

 Copyright 2014 Sotera Defense Solutions, Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */


/*jslint browser: true, unparam: true */

/*globals tangelo, $, d3, SWG */

var highlight_options = [];
var communities = {};
var color = d3.scale.category20();
var min_timestamp;
var max_timestamp;
var min_hits;
var max_hits;
var selected_data;
var USERS = {all: {}, max: 1};
var ALL_TIMESTAMPS = [];

var repulsion_scale = d3.scale.linear().domain([0, 50]).range([1000, 30]);


/*
 Calculate duration in printable format
 */
function formatDuartion(start, end) {
    var duration = end - start;
    var days = parseInt(duration / (3600 * 24));
    duration = duration - (days * 3600 * 24);
    var hours = parseInt(duration / 3600);
    duration = duration - (hours * 3600);
    var minutes = parseInt(duration / 60);
    return days + " days " + hours + " hours " + minutes + " minutes";
}


/*
 Populate the time window slider with the correct range.
 */
function updateTimeSlider() {
    var users = $("#userselect").val();

    var trail_data = $("#trail_select").val();
    if (!trail_data) {
        console.log("null trail data. skipping time slider update.");
        return;
    }
    var trail = trail_data.split("\0")[1];
    var domain = trail_data.split("\0")[0];


    if (!users || users.length == 0) {
        //clearTimeFilter()
        //return
        users = "";
    }
    if (!trail || trail == "") {
        trail = "*";
    }
    dateWidget.makeChart(users, trail, domain);
}


/*
 get the list of all trails
 */
function getTrailList() {
    $.ajax({
        type: "GET",
        url: '/datawake/forensic/graphservice/trails',
        dataType: 'json',
        success: function (trails) {
            d3.select("#trail_select").selectAll("option").remove();
            if (trails != undefined && trails.length > 0) {
                var options = d3.select("#trail_select").selectAll("option")
                    .data(trails).enter();

                options.append("option")
                    .attr("value", function (d) {
                        return d.domain + "\0" + d.trail;
                    })
                    .text(function (d) {
                        if (d.domain)
                            return d.domain + "-->" + d.trail + " users:" + d.userCount + " records: " + d.records;
                        else
                            return "";
                    });
                //.attr("title",function(d) {return trails[d]})
            }
            $("#trail_select").trigger("chosen:updated");
        },
        error: function (jqxhr, textStatus, reason) {
            console.log("getTrailList error " + textStatus + " " + reason);
        }

    })
}


$(function () {
    $("#refresh_btn").click(function () {
        change_graph();
    })
});



/*
 Calls the python service to list all
 graphs in the projects graphs directory,
 populates the selection list, and
 loads the first graph.

 called by window.onload
 */
function list_graphs() {
    $.ajax({
        type: "GET",
        url: '/datawake/forensic/graphservice/list',
        dataType: 'json',
        success: function (data) {
            d3.select("#graph_select").selectAll("option").remove();
            d3.select("#graph_select")
                .on("change", change_graph)
                .selectAll("option")
                .data(data.graphs).enter()
                .append("option")
                .text(function (d) {
                    return d;
                });
            //change_graph()

        },
        error: function (jqxhr, textStatus, reason) {
            console.log("error " + textStatus + " " + reason);
        }
    });
}

function list_users() {
    $.ajax({
        type: "GET",
        url: '/datawake/forensic/graphservice/getusers',
        dataType: 'json',
        success: function (data) {
            //console.log("got users: " + data);

            d3.select("#userselect").selectAll("option").remove();
            var options = d3.select("#userselect").selectAll("option")
                .data(data).enter();

            options.append("option")
                .attr("value", function (d) {
                    return d.id;
                })
                .text(function (d) {
                    return d.name;
                });

            $("#userselect").trigger("chosen:updated");

        },
        error: function (jqxhr, textStatus, reason) {
            console.log("error " + textStatus + " " + reason);
        }
    })
}


/*
 Called whenever a graph is selected to load and draw
 the new graph.
 */
function change_graph() {
    var name = d3.select("#graph_select").property('value');

    //var timewindow = $("#timewindow").slider("option","values")
    var startdate = dateWidget.window_start;
    var enddate = dateWidget.window_end;

    var users = $("#userselect").val();
    if (!users) users = "";

    var trail_data = $("#trail_select").val();
    var trail = trail_data.split("\0")[1];
    var domain = trail_data.split("\0")[0];
    var jsonData = JSON.stringify({
        name: name,
        startdate: startdate,
        enddate: enddate,
        users: users.toString(),
        trail: trail,
        domain: domain
    });
    $.ajax({
        type: "POST",
        url: '/datawake/forensic/graphservice/get',
        data: jsonData,
        contentType: 'application/json',
        dataType: 'json',
        success: function (graph) {
            $("#dialog").dialog().dialog("close");
            console.log("GRAPH")
            console.log(graph)

            communities = {};
            var nodes = graph.nodes.slice();
            var repulsion = 30;
            if (nodes.length < 50) {
                repulsion = parseInt(repulsion_scale(nodes.length));
            }
            console.log("default repulsion = " + repulsion);
            $("#forceslider").slider("value", repulsion);


            min_timestamp = -1;
            max_timestamp = -1;
            min_hits = -1;
            max_hits = -1;

            USERS.all = {};
            USERS.max = 1;
            for (var i in nodes) {
                var node = nodes[i];

                for (var j in node.userNames) {
                    var username = node.userNames[j];
                    if (!(username  in USERS.all)) {
                        USERS.all[username] = USERS.max;
                        USERS.max = USERS.max + 1
                    }
                }

                if (node.timestamps) {
                    var ts = node.timestamps[node.timestamps.length - 1];
                    if (min_timestamp == -1 || ts < min_timestamp)
                        min_timestamp = ts;
                    if (ts > max_timestamp)
                        max_timestamp = ts;
                }
                if (node.hits) {
                    if (node.hits > max_hits)
                        max_hits = node.hits;
                    if (min_hits == -1 || node.hits < min_hits)
                        min_hits = node.hits;
                }
                if (node.community) {
                    communities[node.community] = node.community;
                }
            }

            SWG.drawGraph('node_graph', graph);
            SWG.show_base_legend();

            SWG.viz.selectAll(".node").on('click', function (d) {
                console.log("selected: " + JSON.stringify(d));
                selected_data = d;
            });

            SWG.viz.selectAll(".node").on('click', function (d) {
                showLinkDialog(d);
            });

            SWG.viz.selectAll(".link")
                .attr("class", function (d) {
                    if (d[0].name && d[2].name) {
                        var type1 = d[0].name.substring(0, d[0].name.indexOf(":"));
                        var type2 = d[2].name.substring(0, d[2].name.indexOf(":"));
                        if (type1.indexOf('browse path') == 0 && type2.indexOf('browse path') == 0) {
                            return  "link boldlink";
                        }
                    }
                    return "link";
                })
                .attr("marker-end", function (d) {
                    if (d[0].name && d[2].name) {
                        var type1 = d[0].name.substring(0, d[0].name.indexOf(":"));
                        var type2 = d[2].name.substring(0, d[2].name.indexOf(":"));
                        if (type1.indexOf('browse path') == 0 && type2.indexOf('browse path') == 0) {
                            return  "url(#arrowhead)";
                        }
                    }
                    return "";
                });

            populate_highlights();
        },
        error: function (jqxhr, textStatus, reason) {
            console.log("error " + textStatus + " " + reason);
        }
    });
}


/*
 Override the SWG.node_text_func to change
 the node text that is displayed.

 Default behavior is to display the node name the same as here.
 We override here for example purposes only
 */
SWG.node_text_func = function (d) {
    return d.name;
};


/*
 Populate the highlight selection box
 */
function populate_highlights() {

    // record the currently selected index.
    var previousSelectedIndex = d3.select("#highlights").node().selectedIndex;

    highlight_options = ['none', 'community', 'hits', 'timestamps', 'user', 'shared entities (look ahead only)', 'domain entities (look ahead only)', 'trail']
    highlight_options_text = ["'none'", 'community', 'hits', 'timestamps', 'user', 'shared entities (look ahead only)', 'domain entities (look ahead only)', 'trail']
    for (var type in SWG.node_types) {
        highlight_options.push(type);
        var count = SWG.node_types[type]['count'];
        var text = type;
        highlight_options_text.push(text + " (" + count + ")");
    }

    d3.select("#highlights").selectAll("option").remove();
    d3.select("#highlights")
        .on("change", change_highlight)
        .selectAll("option")
        .data(highlight_options_text).enter()
        .append("option").append("span")
        .text(function (d) {
            return d;
        });

    // if the previously selected index was one of the default options re set that option
    var sel = d3.select("#highlights").node();
    if (previousSelectedIndex > -1 && previousSelectedIndex < sel.length - 1) {
        sel.selectedIndex = previousSelectedIndex;
        change_highlight();
    }
}


/*
 When the highlight selection changes,
 re-color the graph and show
 a dialog box listing the highlighted terms
 */
function change_highlight() {
    $("#dialog").dialog().dialog("close");
    var sel = d3.select("#highlights").node();
    var index = sel.selectedIndex;
    selected_term = highlight_options[index];

    //console.log("highlight options: "+JSON.stringify(highlight_options))
    //console.log("selected index: "+index)

    // Default coloring
    if (index == 0) {
        SWG.defaultColors();
    }
    else if (index == 1) {  // color by community
        SWG.viz.selectAll("svg circle")
            .attr("r", function (d) {
                if (d.size) return d.size;
                else return 5;
            })
            .style("fill", function (d) {
                group = "grey";
                if (d.community) group = color(communities[d.community]);
                return group;
            });
        SWG.show_legend(Object.keys(communities), function (d) {
            return color(communities[d])
        })
    }

    else if (index == 2) {  // color by hits
        console.log("color by hits min: " + min_hits + " max: " + max_hits);
        SWG.clear_legend();
        var color_delta = parseInt(max_hits / 3);
        var gradient_color = d3.scale.linear()
            .domain([1, color_delta * 1, color_delta * 2, color_delta * 3])
            .range(["green", "yellow", "orange", "red"]);

        d3.selectAll("svg circle")
            .style("fill", function (d) {
                group = "grey";
                if (d.hits) group = gradient_color(d.hits);
                return group;
            });

        show_hits_legend();
    }

    else if (index == 3) { // color by timestamps
        SWG.clear_legend();
        var gradient_color = d3.scale.linear()
            .domain([min_timestamp, max_timestamp])
            .range(["#E5FAE6", "#00CE09"]);

        d3.selectAll("svg circle")
            .style("fill", function (d) {
                group = gradient_color(0);
                if (d.timestamps && d.timestamps.length > 0)
                    group = gradient_color(d.timestamps[d.timestamps.length - 1]);
                return group;
            });
        show_timestamp_legend();
    }

    else if (index == 4) { // color by user
        SWG.clear_legend();

        d3.selectAll("svg circle")
            .style("fill", function (d) {
                group = 0;
                if (d.userNames && d.userNames.length > 0)
                    group = USERS.all[d.userNames[0]];
                return color(group);
            })
        var users = USERS.all;
        SWG.show_legend(Object.keys(USERS.all), function (d) {
            return color(users[d]);
        });

    }

    else if (index == 5) { // shared entites
        SWG.clear_legend();

        var max = 0;
        d3.selectAll("svg circle").each(function (d) {
            if (d.entity_matches && d.entity_matches.length > max) {
                max = d.entity_matches.length;
            }
        });

        console.log("MAX: " + max);
        var delta = parseInt((max - 1) / 3);
        if (delta < 1) delta = 1;
        var domain = [1, 1 + delta * 1, 1 + delta * 2, 1 + delta * 3];
        var gradient_color = d3.scale.linear()
            .domain(domain)
            .range(["green", "#ffd700", "orange", "red"]);


        d3.selectAll("svg circle")
            .style("fill", function (d) {
                if (d.entity_matches != undefined) {
                    if (d.entity_matches.length == 0) {
                        return "#000000";
                    }
                    else
                        return gradient_color(d.entity_matches.length);
                }
                else {
                    return "steelblue";
                }

            });


        SWG.show_legend(domain, function (d) {
            return gradient_color(d);
        });

    }

    else if (index == 6) { // domain entities

        SWG.clear_legend();

        var max = 0;
        d3.selectAll("svg circle").each(function (d) {
            if (d.domain_entity_matches && d.domain_entity_matches.length > max) {
                max = d.domain_entity_matches.length;
            }
        });
        console.log("MAX: " + max);
        var delta = parseInt((max - 1) / 3);
        if (delta < 1) delta = 1;
        var domain = [1, 1 + delta * 1, 1 + delta * 2, 1 + delta * 3];
        var gradient_color = d3.scale.linear()
            .domain(domain)
            .range(["green", "#ffd700", "orange", "red"]);


        d3.selectAll("svg circle")
            .style("fill", function (d) {
                if (d.domain_entity_matches != undefined) {
                    if (d.domain_entity_matches.length == 0) {
                        return "#000000";
                    }
                    else return gradient_color(d.domain_entity_matches.length)
                }
                else {
                    return "steelblue";
                }

            });


        SWG.show_legend(domain, function (d) {
            return gradient_color(d);
        });

    }

    else if (index == 7) { // color by trail
        SWG.clear_legend();

        var trailMap = {};
        var i = 0;

        d3.selectAll("svg circle").each(function (d) {
            if (d.trails && d.trails.length > 0) {
                var trail = d.trails[d.trails.length - 1];
                if (!(trail in trailMap)) {
                    trailMap[trail] = i;
                    i = i + 1;
                }
            }
        });


        d3.selectAll("svg circle")
            .style("fill", function (d) {
                if (d.trails && d.trails.length > 0) {
                    var trail = d.trails[d.trails.length - 1];
                    return SWG.color(trailMap[trail]);
                }
                return "black"
            });

        SWG.show_legend(Object.keys(trailMap), function (d) {
            return SWG.color(trailMap[d])
        })

    }

    else { // highlight node type
        SWG.hightlightType(selected_term);
        SWG.showTypeDialog(selected_term);
    }

}


function refreshForensicView() {
    list_graphs();
    list_users();
    updateTimeSlider();
    getTrailList();
    SWG.clear_legend();
    d3.select('#node_graph').selectAll("svg").remove();
}


/*
 Load the UI controls
 */
window.onload = function () {
    // Create control panel.
    $("#control-panel").controlPanel();

    // Enable the popover help items.
    //
    // First create a config object with the common options present.
    var popover_cfg;
    popover_cfg = {
        html: true,
        container: "body",
        placement: "top",
        trigger: "hover",
        title: null,
        content: null,
        delay: {
            show: 100,
            hide: 100
        }
    };
    $.get("/datawake/version/number", function(response){
        var resp = JSON.parse(response);
        $("#forensic_version").html(resp.version);
    });

    // Dataset pulldown help.
    popover_cfg.content = "<b>Select a Graph:</b><br><br>" +
        "Choose a graph form the list.";
    $("#search_help").popover(popover_cfg);

    popover_cfg.content = "<b>Select a Graph:</b><br><br>" +
        "Filter the graph by selecting a combination of:<Br>" +
        "1. Zero or one Trails<br>" +
        "2. Zero or more users<br>" +
        "3. A time range<br><br>"
    $("#filter_help").popover(popover_cfg);


};

function show_timestamp_legend() {
    var min = parseInt(min_timestamp);
    var max = parseInt(max_timestamp);
    if (min == -1) return;

    var oneday = 60 * 60 * 24;
    var days = (max - min) / oneday;
    var timestamp_dict = {};
    var gradient_color = d3.scale.linear()
        .domain([min_timestamp, max_timestamp])
        .range(["#E5FAE6", "#00CE09"]);
    var delta = oneday;
    if (days > 20) delta = 7 * oneday; // use weeks if > 20 days
    if (days > 7 * 20) delta = oneday * 30;// use ~months if > than 20 weeks
    if (days > 365 * 2) delta = ondeay * 365;// user years if > 24 months

    var curr = min;
    while (curr <= max) {
        timestamp_dict[new Date(curr * 1000)] = gradient_color(curr);
        curr = curr + delta;
    }
    SWG.show_legend(Object.keys(timestamp_dict), function (d) {
        return timestamp_dict[d];
    })

}

function show_hits_legend() {
    var min = parseInt(min_hits);
    var max = parseInt(max_hits);
    if (min == -1)
        return;

    var hit_dict = {};
    var color_delta = parseInt(max / 3);
    var gradient_color = d3.scale.linear()
        .domain([min, color_delta * 1, color_delta * 2, max])
        .range(["green", "yellow", "orange", "red"]);

    var delta = parseInt((max - min) / 20);
    if (delta < 1) delta = 1;
    var curr = min;
    while (curr <= max) {
        hit_dict[curr] = gradient_color(curr);
        curr = curr + delta;
    }
    SWG.show_legend(Object.keys(hit_dict), function (d) {
        return hit_dict[d];
    });
}


/*
 Display all vertex details in a popup dialog
 */
function showLinkDialog(data) {

    // close previous dialog and remove all content
    $("#link-dialog").dialog().dialog("close");
    d3.select("#link-dialog").selectAll("div").remove();
    $("#link-dialog").dialog("destroy");


    var id = data.id;
    var type = data.type;

    var mainDiv = d3.select("#link-dialog").append("div");

    // head heading
    mainDiv.append("h4").text(id);
    // provide a link if the id starts with http
    if (id.substring(0, 4) == "http") {
        mainDiv.append("a")
            .style("font-color", "#428bca")
            .style("text-decoration", "underline")
            .attr("href", id)
            .attr("target", "blank")
            .text("open in new tab");
    }
    mainDiv.append("hr");

    // display the node type
    var p1 = mainDiv.append("p");
    p1.text("Node Type: ");
    p1.append("span").text(type);
    mainDiv.append("hr");


    // display look ahead info
    if (type == "lookahead") {
        mainDiv.append("h4").text("Lookahead Details");
        mainDiv.append("p").text("Shared Entities: " + data.entity_matches.length);
        mainDiv.append("ul").selectAll("li").data(data.entity_matches).enter()
            .append("li")
            .text(function (d) {
                return d;
            });
        mainDiv.append("hr");

        mainDiv.append("p").text("Domain Entities: " + data.domain_entity_matches.length);
        mainDiv.append("ul").selectAll("li").data(data.domain_entity_matches).enter()
            .append("li")
            .text(function (d) {
                return d;
            });
        mainDiv.append("hr");
    }


    // display links to other tools
    if (type != "selection") {
        mainDiv.append("h4").text("Memex Tools");
        getExternalLinks(mainDiv,type,id)
        mainDiv.append("hr");

        // list the visit history
        if (data.userNames && data.userNames.length > 0) {
            mainDiv.append("h4").text("Visit History");
            mainDiv.append("p").text("Total visits: " + data.hits);
            var iList = [];
            var i = 0;
            for (user in data.userNames) {
                iList.push(i);
                i = i + 1;
            }
            var rows = mainDiv.append("table").selectAll("tr").data(iList).enter().append("tr");
            rows.append("td").text(function (d) {
                return  new Date(1000 * data.timestamps[d]);
            });
            rows.append("td").attr("padding-left", "10px").text(function (d) {
                return data.userNames[d];
            });
            mainDiv.append("hr");
        }
    }
    else {
        mainDiv.append("h4").text("Selection Data");
        mainDiv.append("span").text("User Name: " + data.userNames[0]);
        mainDiv.append("br");
        mainDiv.append("span").text("Saved At: " + new Date(1000 * data.timestamps[0]));
        mainDiv.append("br");
        mainDiv.append("span").text("Selection Text: ");
        mainDiv.append("br");
        mainDiv.append("br");
        mainDiv.append("p").text(data.data);
        mainDiv.append("hr");
    }

    $("#link-dialog").dialog({
        height: 500,
        width: 500,
        position: { my: "right top", at: "right bottom", of: $(".navbar")[0] }
        //position: [100,100]
    });

}



// Display links to external tools
function getExternalLinks(mainDiv,type,id){

    var linksDiv = mainDiv.append("div")
        .style("font-color", "#428bca")
        .style("text-decoration", "underline");

    $.ajax({
        type: "GET",
        url: "/datawake/forensic/tools/get",
        contentType: 'application/json',
        dataType: 'json',
        success: function (links) {

            if (links.length > 0) {
                for (j in links){
                    linkObj = links[j]
                    var link = linkObj.link.replace("$VALUE", encodeURI(id))
                    if (type == "browse path") {
                        queryterm = "website"
                    }
                    else {
                        queryterm = type
                    }
                    link = link.replace("$ATTR", encodeURI(queryterm))

                    linksDiv.append("a").attr("href",link).text(linkObj.display)
                    linksDiv.append("br")


                }
            }
            else{
                linksDiv.text("No external tools available.")
            }
        },
        error: function (jqxhr, textStatus, reason) {
            console.log("external link error " + textStatus + " " + reason);
        }
    });

}