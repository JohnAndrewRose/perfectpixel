data =
    [
        { year: "2013-01", value: 53, category: "pants" },
        { year: "2013-02", value: 165, category: "pants" },
        { year: "2013-03", value: 269, category: "pants" },
        { year: "2013-04", value: 344, category: "pants" },
        { year: "2013-05", value: 376, category: "shirt" },
        { year: "2013-06", value: 410, category: "shirt" },
        { year: "2013-07", value: 421, category: "shirt" },
        { year: "2013-08", value: 405, category: "shirt" },
        { year: "2013-09", value: 376, category: "shirt" },
        { year: "2013-10", value: 359, category: "shoes" },
        { year: "2013-11", value: 392, category: "shoes" },
        { year: "2013-12", value: 433, category: "shoes" },
        { year: "2014-01", value: 455, category: "shoes" },
        { year: "2014-02", value: 478, category: "shoes" }
    ];

var parseDate = d3.timeParse("%Y-%m");

data.forEach(function (d) {
    d.date = parseDate(d.year);
    d.value = +d.value;
});

// Build a table
var table = d3.select('#table').append('table');
var formatDate = d3.timeFormat("%Y-%m");
var tbody = table.append('tbody')
var tr = tbody.selectAll('tr')
    .data(data).enter()
    .append('tr');
tr.append('td').html(function (d) { return formatDate(d.date); });
tr.append('td').html(function (d) { return d.category });
tr.append('td').html(function (d) { return d.value });
var thead = table.append('thead').append('tr')
thead.append('th').text("date");
thead.append('th').text("category");
thead.append('th').attr("class", "value").text("value");

//Build a barchart
var month_margin = { top: 20, right: 20, bottom: 70, left: 40 },
    month_width = 900 - month_margin.left - month_margin.right,
    month_height = 300 - month_margin.top - month_margin.bottom;

var svg = d3.select("#month").append("svg")
    .attr("width", month_width + month_margin.left + month_margin.right)
    .attr("height", month_height + month_margin.top + month_margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + month_margin.left + "," + month_margin.top + ")");

//Build scales
var x = d3.scaleTime()
    .range([0, month_width])
    .domain([data[0].date, data[data.length - 1].date]);

var y = d3.scaleLinear()
    .range([month_height, 0])
    .domain([0, d3.max(data, function (d) { return d.value; })]);

// Build axis
var yAxis = d3.axisLeft()
    .scale(y)
    .tickSize(-month_width) //as wide as our graph
    .ticks(3);
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)

var xAxis = d3.axisBottom()
    .scale(x)
    .tickFormat(d3.timeFormat("%Y-%m"));


svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + month_height + ")")
    .call(xAxis)

//Add bars
svg.selectAll("rect")
    .data(data)
    .enter().append("rect")
    .style("fill", "#019875")
    .attr("x", function (d) { return x(d.date); })
    .attr("width", 50)
    .attr("y", function (d) { return y(d.value); })
    .attr("height", function (d) { return month_height - y(d.value); });

//Add labels to the bars
svg.selectAll("label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label")
    .style("fill", "#019875")
    .attr("y", function (d) { return y(d.value); })
    .attr("x", function (d) { return x(d.date); })
    .attr("dy", "-.35em") //vertical align middle
    .attr("dx", ".7em") //vertical align middle
    .text(function (d) { return d.value; });

