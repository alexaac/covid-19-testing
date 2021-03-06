// https://gist.github.com/mbostock/1153292

// set the dimensions and margins of the graph
const margin = {top: 50, right: 50, bottom: 50, left: 50},
    width = 1100 - margin.left - margin.right,
    height = 1100 - margin.top - margin.bottom,
    svg_width = width + margin.left + margin.right,
    svg_height = height + margin.top + margin.bottom;

const graph = { nodes: [], links: [] };

// use a tooltip to show node info
const tooltip_div = d3.select("body")
   .append("tooltip_div")
   .attr("class", "tooltip")
   .style("opacity", 0)
   .style("display", "none");

const highlight = (d) => {
   if (d.is_country_of_infection) {
       return;
   };

   let left = d3.event.pageX -20;
   let top = d3.event.pageY + 20;

   if (window.innerWidth - left < 150){
     left = d3.event.pageX - 40;
   }

   tooltip_div.transition()
       .duration(200)
       .style("opacity", .9);

   tooltip_div.html(tooltipHTML(d))
       .style("left", left + 'px')
       .style("top", top + 'px')
       .style("display", null);
};

const tooltipHTML = (d) => {
   return "<b>Cazul " + d.properties.case_no + "</b><br />" +
       (d.properties.gender === 'Bărbat' ? "Bărbat" : "Femeie") +
       (d.properties.age != null && d.properties.age != 0 ? (", " + d.properties.age) : "") +
       (d.properties.county != null && d.properties.county != "" ? (", din  " + d.properties.county) : "") + ".<br />" +
       (d.properties.status != null
           ? ("Status: " + (d.properties.status === "Vindecat" ? "vindecat" : "spitalizat") + ".<br />")
           : "") +
       (d.properties.healing_date !== null ? ("Data recuperării: " + d.properties.healing_date + ".<br />") : "") +
       (d.properties.reference !== null && d.properties.reference !== "" ? ("Detalii: " + '<a href="' + d.properties.reference + '" target= "_blank">aici</a>') : "");
};

const unHighlight = () => {
   tooltip_div.transition()
       .duration(200)
       .style("opacity", 0);
};

// simulation drag
const drag = simulation => {
    const dragstarted = d => {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    const dragged = d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    const dragended = d => {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
};

// simulation link
const linkArc = d => {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    return `
      M${d.source.x},${d.source.y}
      A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `;
};

// updateR the slider
const updateRadius = (nRadius) => {

    // adjust the text on the range slider
    d3.select("#nRadius-value").text(nRadius);
    d3.select("#nRadius").property("value", nRadius);

    // highlight case
    d3.selectAll("circle")
        .attr("stroke-width", "1.5px")
        .attr("r", 8)
        .attr("fill-opacity", 1);
    d3.selectAll(".CO-" + nRadius)
        .attr("r", 15)
        .attr("stroke-width", "10px")
        .attr("fill-opacity", 0.1);
}

(() => {
    
    // Get nodes from links
    // d3.json("cases_relations.json").then( data => { // dummy data
    d3.json("https://covid19.geo-spatial.org/api/statistics/getCaseRelations").then( data => {
        
        const nodes = data.data.nodes;
        const links = data.data.links;

        const sources = nodes.filter( d => d.properties.country_of_infection !== null && d.properties.country_of_infection !== "România");

        // https://observablehq.com/d/cedc594061a988c6
        graph.nodes = nodes.concat(Array.from(new Set(sources.map(d => d.properties.country_of_infection)), name => ({name})));
        graph.links = links.concat(sources.map(d => ({source: d.name, target: d.properties.country_of_infection})));

        changeView();
    });

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

        const types = Array.from(new Set(graph.nodes
            .filter(d => d.is_country_of_infection !== 1)
            .map(d => d.source)));
        const cases = Array.from(new Set(graph.nodes
            .filter(d => d.is_country_of_infection !== 1)
            .map(d => d.properties ? d.properties.case_no : "")));
        const color = d3.scaleOrdinal(d3.schemePaired).domain(types);

        // graph.nodes.shift();
        const links = graph.links;
        const nodes = graph.nodes;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id( d => {
                let name = JSON.parse(JSON.stringify(d)).name;
                return name;
            }))
            .force("charge", d3.forceManyBody()
                                .strength(-100)
                                .distanceMax(1100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius( d => {
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
                .attr("stroke-width", 1.5)
                .selectAll("path")
                .data(links)
                .join("path")
                    .attr("stroke", d => "#999")
                    .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location.toString())})`);

        const node = svg.append("g")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
                .call(drag(simulation));
        
        node.append("circle")
            .attr("class", d => d.properties && `CO-${d.properties.case_no}`)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("r", 8)
            .attr("fill", d => {
                return (d.is_country_of_infection)
                    ? "black"
                    : (d.properties && d.parent 
                        ? color(d.parent.properties.county) 
                        : d.properties ? color(d.properties.county) : "black"); 
            })
            .attr("stroke", d => { return d.properties && d.properties.status === "Vindecat" ? 'green' : '#333'; })
            .on("mouseenter", d => highlight(d));
            // .on("mouseleave", (d) => { unHighlight(); });
            
        node.append("text")
                .attr("x", 8)
                .attr("y", "0.31em")
                .text(d => {
                    return d.is_country_of_infection ? d.country_name : ("#" + d.name);
                })
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 3);

        simulation.on("tick", () => {
            link.attr("d", linkArc);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
        
        // Case slider
        // https://bl.ocks.org/d3noob/c4b31a539304c29767a56c2373eeed79/9d18fc47e580d8c940ffffea1179e77e62647e36
        d3.select("#nRadius").property("max", d3.max(cases));

        // when the input range changes highlight the circle
        d3.select("#nRadius").on("input", function() {
            updateRadius(+this.value);
        });

        // Select first case
        updateRadius(1);

        /******************************** Title ********************************/
        // svg.append("text")
        //     .attr("x", (width / 2))
        //     .attr("y", 0 - (margin.top))
        //     .attr("text-anchor", "middle")
        //     .style("font-size", "16px")
        //     .style("text-decoration", "underline")
        //     .text("Relația cazurilor confirmate");

    };

}).call(this);