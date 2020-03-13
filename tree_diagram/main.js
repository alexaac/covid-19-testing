// https://bl.ocks.org/d3noob/33036206ab10c5ec75cd7f4eae1d454f/0d0f1dabb8a8dfa6dcdabcd858aabcb23a252a38

// set the dimensions and margins of the diagram
var margin = {top: 20, right: 90, bottom: 30, left: 90},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
var treemap = d3.tree()
  .size([height, width]);

(() => {
    // Get the data
    d3.json("tree_data.json").then(function(data) {
        
        const treeData = data;

        changeView(treeData);
    });

    const changeView = (treeData) => {
        //  assigns the data to a hierarchy using parent-child relationships
        var nodes = d3.hierarchy(treeData, function(d) {
            return d.children;
        });

        // maps the node data to the tree layout
        nodes = treemap(nodes);

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        var svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom),
        g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
console.log(nodes);
        // adds the links between the nodes
        var link = g.selectAll(".link")
            .data( nodes.descendants().slice(1))
            .enter().append("path")
                .attr("class", "link")
                .attr("d", function(d) {
                    return "M" + d.y + "," + d.x
                    + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                    + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                    + " " + d.parent.y + "," + d.parent.x;
                    });

        // adds each node as a group
        var node = g.selectAll(".node")
            .data(nodes.descendants())
            .enter().append("g")
            .attr("class", function(d) { 
                return "node" + 
                (d.children ? " node--internal" : " node--leaf"); })
            .attr("transform", function(d) { 
                return "translate(" + d.y + "," + d.x + ")"; });

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