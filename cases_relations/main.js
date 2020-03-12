// https://gist.github.com/mbostock/1153292

// set the dimensions and margins of the graph
const margin = {top: 50, right: 50, bottom: 50, left: 50},
    width = 960 - margin.left - margin.right,
    height = 960 - margin.top - margin.bottom,
    svg_width = width + margin.left + margin.right,
    svg_height = height + margin.top + margin.bottom;

const graph = { nodes: [], links: [] };

// Get the data
(() => {
    
    // Get nodes from links
    d3.json("relatii_cazuri.json").then(function(data) {
    
        data.nodes.forEach(function(d) {

            graph.links.push({
                "source": d.properties.source_no || d.properties.case_no,
                "target": d.properties.case_no,
                "properties": d.properties, 
                "type": (d.properties.country_of_infection != null  && d.properties.country_of_infection != "România") ? d.properties.country_of_infection : 'local'
            });
        });
    
        changeView();
    });

    // use a tooltip to show info per county, simultaneous in all charts
    const tooltip_div = d3.select("body")
        .append("tooltip_div") 
        .attr("class", "tooltip")       
        .style("opacity", 0);

    const highlight = (d) => {
        tooltip_div.transition()    
            .duration(200)    
            .style("opacity", .9);    
        tooltip_div.html(tooltipHTML(d))
            .style("left", (d3.event.pageX - 40) + "px")
            .style("top", (d3.event.pageY) + "px");
    };

    const tooltipHTML = (d) => {
        return "<b>Cazul " + d.properties.case_no + "</b><br />" +
            (d.properties.gender === 'Bărbat' ? "Bărbat, " : "Femeie, ") +
            (d.properties.age != null ? d.properties.age + "," : "") +
            " din  " + d.properties.county + ".<br />" +
            "Status: " + (d.properties.status === "Vindecat" ? "vindecat" : "spitalizat") + ".<br />" +
            (d.properties.healing_date !== null ? ("Data recuperării: " + d.properties.healing_date + ".<br />") : "") +
            (d.properties.reference !== null && d.properties.reference !== "" ? ("Detalii: " + '<a href="' + d.properties.reference + '" target= "_blank">aici</a>') : "");
    };

    const unHighlight = () => {
        tooltip_div.transition()
            .duration(200)
            .style("opacity", 0);
    };

    // append the svg object to the chart div
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin

    const svg = d3.select("#chart")
        .append("svg")
        .attr("class", "chart-group")
        .attr("preserveAspectRatio", "xMidYMid")
        .attr("width", svg_width)
        .attr("height", svg_height)
        .attr("viewBox", '0, 0 ' + svg_width + ' ' + svg_height)
        .on("click", () => { unHighlight(); })
            .append("g")
                .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

    const changeView = () => {
        
        // Compute the distinct nodes from the links.
        graph.links.forEach(function(link) {
            link.source = graph.nodes[link.source] || (graph.nodes[link.source] = {name: link.source, properties: link.properties});
            link.target = graph.nodes[link.target] || (graph.nodes[link.target] = {name: link.target, properties: link.properties});
        });

        const types = Array.from(new Set(graph.links.map(d => d.type)));
        const color = d3.scaleOrdinal(types, d3.schemePaired);

        graph.nodes.shift();
        const links = graph.links;
        const nodes = graph.nodes;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.name))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(function(d) {
                return d.radius
            }))
            .force("x", d3.forceX())
            .force("y", d3.forceY());

        // Per-type markers, as they don't inherit styles.
        svg.append("defs").selectAll("marker")
        .data(types)
                .join("marker")
                    .attr("id", d => `arrow-${d}`)
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 15)
                    .attr("refY", -0.5)
                    .attr("markerWidth", 6)
                    .attr("markerHeight", 6)
                    .attr("orient", "auto")
                .append("path")
                    .attr("fill", color)
                    .attr("fill", "#999")
                    .attr("d", "M0,-5L10,0L0,5");
        
        const link = svg.append("g")
                .attr("fill", "none")
                .attr("stroke-width", 1.2)
                .selectAll("path")
                .data(links)
                .join("path")
                    .attr("stroke", d => "#999")
                    .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);

        const drag = simulation => {

            function dragstarted(d) {
                if (!d3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(d) {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            }
            
            function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        };

        const node = svg.append("g")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
                .call(drag(simulation));
        
        node.append("circle")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("r", 8)
            .attr("fill", function(d) { return d.parent ? color(d.parent.properties.county) : color(d.properties.county); })
            .attr("stroke", function(d) { return d.properties.status === 2 ? 'green' : '#333'; })
            .on("mouseover", d => highlight(d));
            
        node.append("text")
                .attr("x", 8)
                .attr("y", "0.31em")
                .text(d => { return "#" + d.name + ((d.properties.country_of_infection != null  && d.properties.country_of_infection != "România") ? (" <- " + d.properties.country_of_infection) : ""); })
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 3);

        simulation.on("tick", () => {
            link.attr("d", linkArc);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
        
        function linkArc(d) {
            const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
            return `
              M${d.source.x},${d.source.y}
              A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
            `;
        };

    };

}).call(this);