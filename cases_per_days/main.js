// https://bl.ocks.org/d3noob/a44d21b304b9f7260a284b1883232002/1b3a420bb9f51c00003974fda2497625380c7cb9

// set the dimensions and margins of the graph
var margin = {top: 50, right: 50, bottom: 50, left: 100},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    svg_width = width + margin.left + margin.right,
    svg_height = height + margin.top + margin.bottom;

// set the ranges
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

(() => {

    // define the line
    var valueline_total = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.total_case); });
    var valueline_healed = d3.line()
        .x(function(d) { return d.total_healed !== 0 ? x(d.date) : null; })
        .y(function(d) { return y(d.total_healed); });
    var valueline_dead = d3.line()
        .x(function(d) { return d.total_dead !== 0 ? x(d.date) : null; })
        .y(function(d) { return y(d.total_dead); });

    // append the svg object to the chart div
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin

    const svg = d3.select("#chart")
        .append("svg")
        .attr("class", "chart-group")
        .attr("preserveAspectRatio", "xMidYMid")
        .attr("width", svg_width)
        .attr("height", svg_height)       
        .attr('viewBox', '0 0 ' + svg_width + ' ' + svg_height)
            .append("g")
            .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    d3.json("http://unpkg.com/d3-time-format@2/locale/ru-RU.json", function(error, locale) {
        if (error) throw error;

        d3.timeFormatDefaultLocale(locale);

        var format = d3.timeFormat("%c");

        console.log(format(new Date)); // понедельник,  5 декабря 2016 г. 10:31:59
    });

    // Get the data
    const promises = [
        d3.json("statistici_pe_zile.json")
    ];

    Promise.all(promises).then( data => {
        const cases_data = data[0].data;

        // parse the date / time
        var parseTime = d3.timeParse("%Y-%m-%d");

        // format the data
        cases_data.forEach(function(d) {
            d.date = parseTime(d.day_case);
            d.date.toLocaleDateString('ro-RO');
            d.total_case = +d.total_case;
        });

        changeView(cases_data);
    }).catch( 
        error => console.log(error)
    );

    const changeView = (data) => {

        // Scale the range of the data
        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([0, d3.max(data, function(d) { return d.total_case; })]);

        /****************************** Valueline Path ********************************/
        svg.append("path")
            .data([data])
            .attr("class", "line_total")
            .attr("d", valueline_total);
        svg.append("path")
            .data([data])
            .attr("class", "line_healed")
            .attr("d", valueline_healed);
        svg.append("path")
            .data([data])
            .attr("class", "line_dead")
            .attr("d", valueline_dead);
            
        /******************************** Scatterplot ********************************/
        svg.selectAll("dot")
            .data(data)
            .enter().append("circle")
                .attr("r", 5)
                .attr("cx", function(d) { return x(d.date); })
                .attr("cy", function(d) { return y(d.total_case); });
        svg.selectAll("dot")
            .data(data)
            .enter().append("circle")
                .attr("r", 5)
                .attr("cx", function(d) { return d.total_healed !== 0 ? x(d.date) : null; })
                .attr("cy", function(d) { return y(d.total_healed); });
        svg.selectAll("dot")
            .data(data)
            .enter().append("circle")
                .attr("r", 5)
                .attr("cx", function(d) { return d.total_dead !== 0 ? x(d.date) : null; })
                .attr("cy", function(d) { return y(d.total_dead); });

        /******************************** Title ********************************/
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 4))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text("Cazurile de COVID-19 din România pe zile");

        /******************************** Labels ********************************/
        var xLabel = svg.append("text")
            .attr("y", height + 50)
            .attr("x", width / 2)
            .attr("font-size", "18px")
            .attr("text-anchor", "middle")
            .text("Perioadă de timp");
        var yLabel = svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -30)
            .attr("x", -170)
            .attr("font-size", "18px")
            .attr("text-anchor", "middle")
            .text("Număr de persoane");

        /******************************** Legend ********************************/
        var statuses = [
            { status: "total", color: "steelblue", label: "Cazuri confirmate"},
            { status: "healed", color: "limegreen", label: "Recuperări" },
            { status: "dead", color: "red", label: "Decese" }
        ];

        var legend = svg.append("g")
            .attr("transform", "translate(130,0)");

        statuses.forEach(function(elem, i){
            var legendRow = legend.append("g")
                .attr("transform", "translate(0, " + (i * 20) + ")");

            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", elem.color);

            legendRow.append("text")
                .attr("x", -10)
                .attr("y", 10)
                .attr("text-anchor", "end")
                .style("text-transform", "capitalize")
                .text(elem.label);
        });

        /******************************** X Axis ********************************/
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%d/%m")));

        // Add the Y Axis
        svg.append("g")
            .call(d3.axisLeft(y).ticks(5));

        /******************************** Tooltip Code ********************************/

        var focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("line")
            .attr("class", "x-hover-line hover-line")
            .attr("y1", 0)
            .attr("y2", height);

        focus.append("line")
            .attr("class", "y-hover-line hover-line")
            .attr("x1", 0)
            .attr("x2", width);

        focus.append("circle")
            .attr("r", 5.5);

        focus.append("text")
            .attr("x", 0)
            .attr("dy", "-1em");

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .on("mouseover", function() { focus.style("display", null); })
            .on("mouseout", function() { focus.style("display", "none"); })
            .on("mousemove", mousemove);

        var bisectDate = d3.bisector(function(d) { return d.date; }).left;

        function mousemove() {

            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0, 1),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            focus.attr("transform", "translate(" + x(d.date) + "," + y(d.total_case) + ")");
            focus.select("text").html("Ziua " + d.day_no);
            focus.select(".x-hover-line").attr("y2", height - y(d.total_case));
            focus.select(".y-hover-line").attr("x2", -x(d.date));
            tooltipHTML(d);
        }

        const tooltipHTML = (d) => {
            return "<b>Ziua " + d.day_no + "</b><br />" +
                    "Cazuri confirmate noi: " + d.new_case_no + "<br />" +
                    "Cazuri confirmate total: " + d.total_case + "<br />" +
                    "Recuperări noi: " + d.new_healed_no + "<br />" +
                    "Recuperări total: " + d.total_healed + "<br />" +
                    "Decese noi: " + d.new_dead_no + "<br />" +
                    "Decese total: " + d.total_dead + "<br />";

        };

        /******************************** Tooltip Code ********************************/

    };

}).call(this);