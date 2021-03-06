import * as Config from './Config.js';
import * as Data from './Data.js';
import * as Tooltip from './Tooltip.js';
import * as Draw from './Draw.js';
import * as Language from './Language.js';
import * as Layout from './Layout.js';

let graph = {nodes: [], links: []};
let svg, sources, casesData, cases;

let legendStatus = false, infoStatus = true, searchStatus = true;
let playCasesNow, thisCaseId, thisCaseOrder;

// Switch the language to english/romanian
let language = d3.select('#language').node().value;

(() => {

// Options for loading spinner
let opts = {lines: 9, length: 4, width: 5, radius: 12, scale: 1, corners: 1, color: '#f40000', opacity: 0.25, rotate: 0, direction: 1, speed: 1, trail: 30, fps: 20, zIndex: 2e9, className: 'spinner', shadow: false, hwaccel: false, position: 'absolute'},
    target = document.getElementById('spinner'),
    spinner;

spinner = new Spinner(opts).spin(target);

// Load data
const promises = [
    d3.json('https://covid19.geo-spatial.org/api/statistics/getCaseRelations')
];

Promise.all(promises).then( data => {
    casesData = data[0];

    setupGraph();
    drawGraph();
    setActions();
}).catch(
    error => console.log(error)
);

const setupGraph = () => {

    sources = casesData.data.nodes.filter( d => d.properties.country_of_infection !== null && d.properties.country_of_infection !== 'România' && d.properties.country_of_infection !== 'Romania');

    graph.nodes = casesData.data.nodes;
    graph.links = casesData.data.links;

    cases = Array.from(new Set(graph.nodes.map(d => d.properties ? +d.properties.case_no : '')));

    // https://observablehq.com/d/cedc594061a988c6
    graph.nodes = graph.nodes.concat(Array.from(new Set(sources.map(d => d.properties.country_of_infection)), name => ({name})));
    graph.links = graph.links.concat(sources.map(d => ({target: d.name, source: d.properties.country_of_infection})));

    graph.nodes = Data.formatNodes(graph.nodes);
}

const drawGraph = () => {
    
    let simulation = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links).id( d => d.name))
        .force('center', d3.forceCenter(Config.width / 2, Config.height / 2))
        .force('charge', d3.forceManyBody())
        .force('x', d3.forceX())
        .force('y', d3.forceY())
        .alphaDecay([0.02])
        .stop();

    simulation.tick(120);
    // simulation.restart();

    // simulation.on('tick', ticked);
    // simulation.force('link').links(graph.links);
    
    // setTimeout(() => {
    //     simulation.stop();
    // }, 5000);

    // Append the svg object to the chart div
    svg = d3.select('#chart')
        .append('svg')
            .attr('class', 'chart-group')
            // .attr('preserveAspectRatio', 'xMinYMid')
            .attr('width', Config.width)
            .attr('height', Config.height)
            // .attr('viewBox', [-Config.width / 2, -Config.height / 2, Config.width, Config.height]);

    // Append zoomable group
    svg.append('g')
        .attr('class', 'zoomable-group')
        .attr('transform', `translate(${Config.margin.left}, ${Config.margin.top})`)
        // .style('transform-origin', '50% 50% 0');

    const canvas = d3.select('canvas')
        .attr('width', Config.width + 'px')
        .attr('height', Config.height + 'px')
        .node();
    const context = canvas.getContext('2d');

    const linkArc = (d) => {
        const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
        return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `;
    };
    
    const drawLink = (d) => {
        // context.moveTo(d.source.x, d.source.y);
        // context.lineTo(d.target.x, d.target.y);
        context.strokeStyle = "#ccc";
        context.stroke(new Path2D(linkArc(d)));
    }

    let transform = d3.zoomIdentity;

    const canvasUpdate = () => {
        context.save();

        context.clearRect(0, 0, Config.width, Config.height);
        context.translate(transform.x, transform.y);
        context.scale(transform.k, transform.k);

        context.beginPath();
        graph.links.forEach(drawLink);
        context.strokeStyle = "#aaa";
        context.stroke();

        context.restore();
    };

    const zoomed = () => {
        transform = d3.event.transform;
        canvasUpdate();

        let zoomableGroup = d3.selectAll('.zoomable-group');

        zoomableGroup.attr("transform", d3.event.transform);

        let scale = d3.event.transform.k;
        if (scale > 0.8) {
            zoomableGroup.selectAll('.node-labels > text')
            .attr('transform', 'scale(' + (1 / scale) + ')');
        };
        return Layout.hideLabels(scale);
    };

    let zoom = d3.zoom()
        .scaleExtent([0.2, 10])
        .on('zoom', zoomed);

    // Apply zoom handler and zoom out
    svg.call(zoom);
    d3.select(canvas).call(zoom);

    svg.transition().call(zoom.scaleBy, 0.3);
};

const setActions = () => {

    // Add legends
    Layout.createLegend(Layout.statusColor(language), 300, 300, 'status-legend', Language.status(language));
    Layout.createLegend(Layout.countyColor, 900, 1100, 'county-legend', Language.county(language));
    Layout.createLegend(Layout.genderColor(language), 200, 200, 'gender-legend', Language.gender(language));
    Layout.createLegend(Layout.ageColor, 400, 400, 'age-legend', Language.age(language));

    // Zoom by scroll, pan
    d3.select('#zoom-in')
        .on('click', () => svg.transition().call(zoom.scaleBy, 2));
    d3.select('#zoom-out')
        .on('click', () => svg.transition().call(zoom.scaleBy, 0.5));
    d3.select('#reset-zoom').on('click', () => resetZoom());

    // Change colors from status to counties and vice versa
    d3.select('#color-counties')
        .on('click', () => Layout.colorCounties());
    d3.select('#color-status')
        .on('click', () => Layout.colorStatus());
    d3.select('#color-gender')
        .on('click', () => Layout.colorGender());
    d3.select('#color-age')
        .on('click', () => Layout.colorAge());

    // Toggle the legend
    const toggleLegend = () => {
        if (legendStatus === true) {
            d3.select('#legend-div').classed('hide', true);
            legendStatus = false;
        } else {
            d3.select('#legend-div').classed('hide', false);
            legendStatus = true;
        };
    };
    d3.select('#legend-div').classed('hide', true);
    d3.select('#toggle-legend')
        .on('click', () => toggleLegend());

    // Highlight and pan to searched Id
    d3.select('#search-case')
        .on('click', () => {
            if (searchStatus === true) {
                d3.select('#search-input').classed('hide', false);
                searchStatus = false;
            } else {
                d3.select('#search-input').classed('hide', true);
                searchStatus = true;
            };
        });
    d3.select('#search-input')
        .on('input', function() {
            if (cases.includes(+this.value)) {
                Tooltip.highlightSearchedId(+this.value);
            }
        });

    // General page info
    d3.select('#show-info').on('click', () => infoStatus = Tooltip.toggleInfo(infoStatus, language));

    // Start/stop the animation - highlight the cases ordered by day and case number
    d3.select('#play-cases')
        .on('click', () => {
            d3.select('#play-cases').classed('hide', true);
            d3.select('#pause-cases').classed('hide', false);
            playCases();
        });
    d3.select('#pause-cases')
        .on('click', () => {
            d3.select('#pause-cases').classed('hide', true);
            d3.select('#play-cases').classed('hide',false);
            pauseCases();
        });

    const playCases = () => {
        svg.call(zoom.scaleTo, 0.5);
        thisCaseOrder = d3.select('#nRadius').node().value;
        if (+thisCaseOrder === (+cases.length - 1)) thisCaseOrder = 0;

        playCasesNow = setInterval(() => {
            thisCaseId = cases[thisCaseOrder];
            if (thisCaseId !== undefined) {
                Layout.updateRadius(cases, thisCaseOrder);
                thisCaseOrder++;
            } else {
                thisCaseOrder = 0;
            }
        }, 200);
    };
    const pauseCases = () => {
        clearInterval(playCasesNow);
    };

    d3.select('#clear-tooltip')
        .on('click', () => { Tooltip.unHighlight(); Tooltip.hideTooltip(); });

    // Case slider to highlight nodes by id
    // https://bl.ocks.org/d3noob/c4b31a539304c29767a56c2373eeed79/9d18fc47e580d8c940ffffea1179e77e62647e36

    // When the input range changes highlight the circle
    d3.select('#nRadius').on('input', function() {
        Layout.updateRadius(cases, +this.value);
    });
    d3.select('#nRadius').property('max', cases.length-1);
    Layout.updateRadius(cases, cases.length-1);

    // Draw nodes and links
    Draw.NodesAndLinks(graph, cases);

    // Color the legend for counties
    Layout.colorStatus();

    // Hide case labels first
    Layout.hideLabels(1);

    // Zoom to latest case, when loading spinner stops
    spinner.stop();
    d3.select('tooltip_div').classed('tooltip-abs', true);
    d3.select('#CO-' + d3.max(cases))
        .attr('r', d => 2 * d.r)
        .dispatch('mouseover');

};

}).call(this);