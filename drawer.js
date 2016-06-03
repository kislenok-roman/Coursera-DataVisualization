// based on http://mbostock.github.io/d3/talk/20111116/bundle.html
window.d3drawer = function() {
    var w = 1280, h = 800,
        rx = w / 2, ry = h / 2,
        m0,
        rotate = 0,
        div,
        svg;

    var splines = [];

    var cluster = d3.layout.cluster()
        .size([360, ry - 120])
        .sort(function(a, b) { return d3.ascending(a.key, b.key); });

    var bundle = d3.layout.bundle();

    var line = d3.svg.line.radial()
        .interpolate("bundle")
        .tension(0.9)
        .radius(function(d) { return d.y; })
        .angle(function(d) { return d.x / 180 * Math.PI; });

    var arc = d3.svg.arc()
        .outerRadius(ry - 120)
        .innerRadius(0)
        .startAngle(0)
        .endAngle(2 * Math.PI);

    var color = d3.scale.category20c();

    var cross = function (a, b) {
        return a[0] * b[1] - a[1] * b[0];
    }

    var dot = function (a, b) {
        return a[0] * b[0] + a[1] * b[1];
    }

    var mouse = function (e) {
        return [e.pageX - rx, e.pageY - ry];
    }

    var mousedown = function() {
      m0 = mouse(d3.event);
      d3.event.preventDefault();
    }

    var mouseover = function (d) {
        svg.selectAll("path.link.target-" + d.key)
            .classed("target", true)
            .each(updateNodes("source", true));
        svg.selectAll("path.link.source-" + d.key)
            .classed("source", true)
            .each(updateNodes("target", true));
    }

    var mouseout = function (d) {
        svg.selectAll("path.link.source-" + d.key)
            .classed("source", false)
            .each(updateNodes("target", false));

        svg.selectAll("path.link.target-" + d.key)
            .classed("target", false)
            .each(updateNodes("source", false));
    }

    var mousemove = function() {
        if (m0) {
            var m1 = mouse(d3.event),
                dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;
            div.style("-webkit-transform", "translateY(" + (ry - rx) + "px)rotateZ(" + dm + "deg)translateY(" + (rx - ry) + "px)");
        }
    }

    function mouseup() {
        if (m0) {
            var m1 = mouse(d3.event),
                dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;

            rotate += dm;
            if (rotate > 360) {
                rotate -= 360;
            } else if (rotate < 0) {
                rotate += 360;
            }
            m0 = null;

            div.style("-webkit-transform", null);

            svg
                .attr("transform", "translate(" + rx + "," + ry + ")rotate(" + rotate + ")")
                .selectAll("g.node text")
                    .attr("dx", function(d) {
                        return (d.x + rotate) % 360 < 180 ? 8 : -8;
                    })
                    .attr("text-anchor", function(d) {
                        return (d.x + rotate) % 360 < 180 ? "start" : "end";
                    })
                    .attr("transform", function(d) {
                        return (d.x + rotate) % 360 < 180 ? null : "rotate(180)";
                    });
        }
    }

    var updateNodes = function (name, value) {
        return function (d) {
            if (value) {
                this.parentNode.appendChild(this);
            }
            svg.select("#node-" + d[name].key).classed(name, value);
        };
    }

    var formatClusters = function(nodes, group) {
        if (true) {
            // use clustering
            var nodes = nodes.map(function(d) {
                d.children = [];
                return d;
            })
            var lnodes = d3.nest().key(function(d) {
                return d.group
            }).entries(nodes);
            lnodes.forEach(function(d) {
                d.parent = null;
                d.children = d.values;
                delete d.values;
                d.children.forEach(function(d1) {
                    d1.parent = d;
                })
            });
            var maxgroup = d3.max(nodes, function(d) {
                return d.group
            });
            group.forEach(function(d) {
                var left = lnodes.filter(function(d1) {
                    return d1.key == d[0]
                })[0];
                var right = lnodes.filter(function(d1) {
                    return d1.key == d[1]
                })[0];
                var newnode = {
                    key: ++maxgroup,
                    parent: null,
                    children: [left, right]
                }
                left.parent = newnode;
                right.parent = newnode;
                lnodes.push(newnode);

                lnodes = lnodes.filter(function(d1) {
                    return d1.key != d[0] && d1.key != d[1]
                })
            })

            return lnodes[0];
        } else {
            // or use grouping
            nodes.forEach(function(d) {
                d.children = [];
            })
            var lnodes = d3.nest().key(function(d) {
                return d.group
            }).entries(nodes);
            var node = {key: "0", children: lnodes}
            lnodes.forEach(function(d) {
                d.children = d.values;
                d.parent = node;
                delete d.values;
            });
            return node;
        }
    }

    var parseEdges = function(nodes, edges) {
        return edges.map(function(d) {
            return {
                source: nodes.filter(function(d1) {
                    return d1.key == d.source;
                })[0],
                target: nodes.filter(function(d1) {
                    return d1.key == d.target;
                })[0]
            }
        })
    }

    var mouseoverConference = function(d) {
        var key = d.conference.replace(/ /gi, "-");
        d3.select("div.legend-element." + key)
            .classed("selected", true);
        d3.selectAll("circle." + key)
            .classed("selected", true);
    }

    var mouseoutConference = function(d) {
        var key = d.conference.replace(/ /gi, "-");
        d3.select("div.legend-element." + key)
            .classed("selected", false);
        d3.selectAll("circle." + key)
            .classed("selected", false);
    }

    var drawGraph = function(id, legendId, data) {
        div = d3.select("#" + id)
            .style("width", w + "px")
            .style("height", h + "px");

        svg = div.append("svg")
            .attr("width", w)
            .attr("height", h)
                .append("g")
                    .attr("transform", "translate(" + rx + "," + ry + ")");

        svg.append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .on("mousedown", mousedown);

        var nodes = cluster.nodes(formatClusters(data.nodes, data.group)),
            links = parseEdges(data.nodes, data.edges),
            splines = bundle(links);

        var path = svg.selectAll("path.link")
            .data(links)
            .enter()
                .append("path")
                    .attr("class", function(d) {
                        return "link source-" + d.source.key + " target-" + d.target.key;
                    })
                    .attr("d", function(d, i) {
                        return line(splines[i]);
                    });

        var g = svg.selectAll("g.node")
            .data(nodes.filter(function(n) {
                return !n.children;
            }))
            .enter()
                .append("g")
                    .attr("class", "node")
                    .attr("id", function(d) {
                        return "node-" + d.key;
                    })
                    .attr("transform", function(d) {
                        return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                    });
        g.append("circle")
            .attr("cx", function(d) {
                return d.x < 180, -8, 8
            })
            .attr("cy", 0)
            .attr("r", 5)
            .attr("class", function(d) { return d.conference.replace(/ /gi, "-")})
            .attr("fill", function(d) { return color(d.conference) })
            .attr("stroke", function(d) { return color(d.conference) })
            .on("mouseover", function(d) {
                mouseover(d);
                mouseoverConference(d);
            })
            .on("mouseout", function(d) {
                mouseout(d);
                mouseoutConference(d);
            })
                .append("title")
                    .text(function(d) {
                        return "Conference: " + d.conference
                    })
        g.append("text")
            .attr("dx", function(d) {
                return d.x < 180 ? 16 : -16;
            })
            .attr("dy", ".31em")
            .attr("text-anchor", function(d) {
                return d.x < 180 ? "start" : "end";
            })
            .attr("transform", function(d) {
                return d.x < 180 ? null : "rotate(180)";
            })
            .text(function(d) {
                return d.name;
            })
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        var legend = d3.select("#" + legendId)
            .selectAll("div.legend-element")
                .data(d3.nest()
                    .key(function(d) {
                        return d.conference
                    })
                    .entries(data.nodes).map(function(d) {
                        return {conference: d.key}
                    }))
                .enter()
                    .append("div")
                        .attr("class", function(d) {
                            return "legend-element " + d.conference.replace(/ /gi, "-")
                        })
                        .on("mouseover", mouseoverConference)
                        .on("mouseout", mouseoutConference);
        legend.append("span")
            .attr("class", "ico")
            .style("background-color", function(d) { return color(d.conference) });
        legend.append("span")
            .attr("class", "txt")
            .text(function(d) { return d.conference });


    }

    var changeTension = function(value) {
        line.tension(value / 100);
        path.attr("d", function(d, i) {
            return line(splines[i]);
        });
    }

    return {
        drawGraph: drawGraph,
        changeTension: changeTension,
        mousemove: mousemove,
        mouseup: mouseup
    }
}()
