// https://gist.github.com/mbostock/1153292

const color = d3.scale.category20c();
const graph = { nodes: [], links: [] }, dummy = [];


(() => {
    
    d3.json("./cazuri.json", function(error, json) {
        if (error) throw error;
    
        data = json.data;
        data.forEach(function(d) {
    
            dummy.push({
                "source": d.source_no || d.case_no,
                "target": d.case_no,
                "properties": d
            });
                   
        });
    
        update();
    });

    // use a tooltip to show info per county, simultaneous in all charts
    const tooltip_div = d3.select("body")
        .append("tooltip_div") 
        .attr("class", "tooltip")       
        .style("opacity", 0);

    const unHighlight = () => {
        tooltip_div.transition()    
            .duration(200)    
            .style("opacity", 0);
    }

    const highlight = (d) => {
        tooltip_div.transition()    
            .duration(200)    
            .style("opacity", .9);    
        tooltip_div.html(tooltipHTML(d))
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        d3.selectAll(".CO-" + d.properties.case_no)
            .attr("style", "stroke: #00ffff; stroke-Config.viewport_width: 2px; fill-opacity: 0.8; cursor: pointer;");
    };

    const tooltipHTML = (d) => {
        return "<b>Cazul " + d.properties.case_no + "</b><br />" +
        (d.properties.gender === 'M' ? "Bărbat, " : "Femeie, ") +
        (d.properties.age != null ? d.properties.age + "," : "") +
        ( d.properties.county_code === "B" ? " din București" : (" din județul " + 
        d.properties.county_code)) + ".<br />" +
        "Status: " + (d.properties.status === 2 ? "recuperat" : "în spitalizare") + ".<br />" +
        (d.properties.healing_date !== null ? ("Data recuperării: " + d.properties.healing_date + ".<br />") : "") +
        (d.properties.reference !== null && d.properties.reference !== "" ? ("Detalii: " + '<a href="' + d.properties.reference + '" target= "_blank">aici</a>') : "");
    };

    function update() {

        graph.links = dummy;
        // Compute the distinct nodes from the links.
        graph.links.forEach(function(link) {
            link.source = graph.nodes[link.source] || (graph.nodes[link.source] = {name: link.source, properties: link.properties});
            link.target = graph.nodes[link.target] || (graph.nodes[link.target] = {name: link.target, properties: link.properties});
        });

        var width = 960,
                height = 500;

        var force = d3.layout.force()
                .nodes(d3.values(graph.nodes))
                .links(d3.values(graph.links))
                .size([width, height])
                .linkDistance(60)
                .charge(-300)
                .on("tick", tick)
                .start();
            
        var svg = d3.select("body").append("svg")
                .attr("width", width)
                .attr("height", height)
                .on("click", () => { unHighlight(); });
        
        // Per-type markers, as they don't inherit styles.
        svg.append("defs").selectAll("marker")
                .data(["suit", "licensing", "resolved"])
                .enter().append("marker")
                    .attr("id", function(d) { return d; })
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 15)
                    .attr("refY", -1.5)
                    .attr("markerWidth", 6)
                    .attr("markerHeight", 6)
                    .attr("orient", "auto")
                .append("path")
                    .attr("d", "M0,-5L10,0L0,5");
        
            

        var path = svg.append("g").selectAll("path")
                .data(force.links())
                .enter().append("path")
                    .attr("class", function(d) { return "link " + d.type; })
                    .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });
        
        var circle = svg.append("g").selectAll("circle")
                .data(force.nodes())
                .enter().append("circle")
                    .attr("r", 8)
                    .attr("fill", function(d) { return d.parent ? color(d.parent.properties.county_code) : color(d.properties.county_code); })
                    .attr("stroke", function(d) { return d.properties.status === 2 ? 'green' : '#333'; })
                    .on("click", d => highlight(d)) 
                    .on("mouseover", d => highlight(d))
                    // .on("mouseout", d => unHighlight(d))
                    .call(force.drag);
            
        circle.append("title")
                .text(function(d) { return d.properties.description; });

        var text = svg.append("g").selectAll("text")
                .data(force.nodes())
                .enter().append("text")
                    .attr("x", 8)
                    .attr("y", ".31em")
                    .text(function(d) { return "#" + d.name + " " + d.properties.county_code; });

        // Use elliptical arc path segments to doubly-encode directionality.
        function tick() {
                path.attr("d", linkArc);
                circle.attr("transform", transform);
                text.attr("transform", transform);
        }
        
        function linkArc(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        }
        
        function transform(d) {
                return "translate(" + d.x + "," + d.y + ")";
        }

    };

}).call(this);