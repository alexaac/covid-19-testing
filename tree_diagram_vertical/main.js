// https://bl.ocks.org/d3noob/33036206ab10c5ec75cd7f4eae1d454f/0d0f1dabb8a8dfa6dcdabcd858aabcb23a252a38

// set the dimensions and margins of the diagram
var margin = {top: 20, right: 90, bottom: 30, left: 90},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const cluster = d3.cluster()
    .size([width - 160, height]);

(() => {
    // Get the data
    d3.json("tree_data.json").then(function(data) {
        
        const root = d3.hierarchy(data);

        changeView(root);
    });

    const changeView = (root) => {

        cluster(root);

        function elbow (d) {
            return "M" + d.source.x + "," + d.source.y
                + "H" + d.target.x + "V" + d.target.y;
        };

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        var svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom),
        g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // adds the links between the nodes
        var link = g.selectAll(".link")
            .data(root.links())
            .enter().append("path")
                .attr("class", "link")
                .attr("d", elbow);

        // adds each node as a group
        var node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", function(d) { 
                return "node" + 
                (d.children ? " node--internal" : " node--leaf"); })
            .attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")"; });

        // adds circles as nodes
        node.append("circle")
            .attr("r", 2.5);

        // adds the text to the node
        node.append("text")
            .attr("dy", ".15em")
            .attr("x", function(d) { return d.children ? -13 : 13; })
            .style("text-anchor", function(d) { 
                return d.children ? "end" : "start"; 
            })
            .text(function(d) { return d.data.name; });
    };

}).call(this);