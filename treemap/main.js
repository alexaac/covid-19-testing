// set the dimensions and margins of the graph
const margin = {top: 50, right: 50, bottom: 50, left: 50},
    width = 1250 - margin.left - margin.right,
    height = 1050 - margin.top - margin.bottom,
    svg_width = width + margin.left + margin.right,
    svg_height = height + margin.top + margin.bottom;

// use a tooltip to show node info
const tooltip_div = d3.select("body")
   .append("tooltip_div")
   .attr("class", "tooltip")
   .style("opacity", 0)
   .style("display", "none");

const format = d3.format(",d");

const highlight = (d) => {
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
    return "<b>" + d.data.county + "</b><br />" +
        "Confirmate: " + d.data.total_county + "<br />" +
        "Vindecări: " + d.data.total_healed + "<br />" +
        "Decese: " + d.data.total_dead;

    return `${d.ancestors().reverse().map(d => d.data.county_code).join("/")}</br>${format(d.data.total_county)} cases`;
};

const unHighlight = () => {
    tooltip_div.transition()
        .duration(200)
        .style("opacity", 0);
};


(() => {

    // d3.json("cases_relations.json").then( data => { // dummy data
    d3.json("https://covid19.geo-spatial.org/api/dashboard/getCasesByCounty").then( data => {

        nodes = data.data.data;

        changeView(nodes);
    });

    const changeView = (nodes) => {

        const counties = Array.from(new Set(nodes.map(d => d.county_code)));
        const color = d3.scaleOrdinal(d3.schemePaired).domain(counties);

        const svg = d3.select("#chart")
            .append("svg")
            .attr("class", "chart-group")
            .attr("preserveAspectRatio", "xMidYMid")
            .attr("width", svg_width)
            .attr("height", svg_height)
            .attr("viewBox", '0, 0 ' + svg_width + ' ' + svg_height)
                .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
        const data = {
            "name": "Districts",
            "children": nodes,
        };

        const format = d3.format(",d");

        const treemap = data => d3.treemap()
        .tile(d3.treemapResquarify)
        .size([width, height])
        .padding(1)
        .round(true)
            (d3.hierarchy(data)
                .eachBefore( d => { 
                    return d.data.county_code = (d.parent && d.parent.data.county_code !== "undefined" ? d.parent.data.county_code + "." : "") + d.data.county_code; 
                })
                .sum(d => d.total_county)
                .sort((a, b) => b.total_county - a.total_county))

        const root = treemap(data);

        const leaf = svg.selectAll("g")
            .data(root.leaves())
            .join("g")
                .attr("transform", d => `translate(${d.x0},${d.y0})`);

        leaf.append("rect")
            .attr("id", d => d.data.county_code)
            .attr("class", "districts")
            .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.county_code); })
            .attr("fill-opacity", 0.6)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .on("mouseover", d => highlight(d))
            .on("mouseout", d => unHighlight(d));

        leaf.append("clipPath")
            .attr("id", d => `clip-${d.data.county_code}`)
            .append("use")
                .attr("xlink:href", d => `#${d.data.county_code}`);

        leaf.append("text")
            .attr("clip-path", d => `url(#clip-${d.data.county_code})`)
            .selectAll("tspan")
            .data(d => d.data.county_code.split(/(?=[A-Z][^A-Z])/g).concat(format(d.data.total_county)))
            .join("tspan")
                .attr("x", 3)
                .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
                .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
                .text(d => d);

        /******************************** Title ********************************/
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text("Repartiția cazurilor pe județe");
    };

}).call(this);