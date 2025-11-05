// Import D3
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Select SVG element
const svg = d3.select("#heatmap");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Select yearSlider & yearLabel html elements
const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");

// Grid setup
const numCols = 10;          // number of columns in grid
const cellSize = 70;         // size of each square
const padding = 40;          // space sround grid

// Color scale setup
const colorScale = d3.scaleSequential(d3.interpolateYlOrRd);

// Load data from JSON
d3.json("data/complaints_by_precinct.json").then(data => {
  // Convert numeric values
  data.forEach(d => {
    d.year_received = +d.year_received;
    d.total_complaints = +d.total_complaints;
    d.precinct = d.precinct.toString();
  });

  // Determine year range dynamically
  const years = [...new Set(data.map(d => d.year_received))].sort((a, b) => a - b);
  yearSlider.min = years[0];
  yearSlider.max = years[years.length - 1];
  yearSlider.value = years[0];
  yearLabel.textContent = years[0];

  // Get sorted list of precinct IDs
  const precincts = [...new Set(data.map(d => d.precinct))].sort();

  // Compute global max complaint count & set color scale
  const maxComplaints = d3.max(data, d => d.total_complaints);
  colorScale.domain([0, maxComplaints]);

  // Draw Heatmap Squares
  function updateHeatmap(selectedYear) {
    yearLabel.textContent = selectedYear; // Update label text each time the year is changed
    const filtered = data.filter(d => d.year_received === +selectedYear); // Filter data to only show records from the selected year

    const squares = svg.selectAll(".square").data(filtered, d => d.precinct); // select all existing squares and binds them to new filtered data, use precinct as key so squares stay in same spot across updates

    squares.join(
      enter => enter.append("rect") // When load a new year, new squares are added for each precinct
        .attr("class", "square")
        .attr("x", (d, i) => (i % numCols) * (cellSize + 5) + padding)
        .attr("y", (d, i) => Math.floor(i / numCols) * (cellSize + 5) + padding)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", d => colorScale(d.total_complaints))
        .append("title")
        .text(d => `Precinct ${d.precinct}\n${d.total_complaints} complaints`),
      update => update // Existing squares change color if counts update
        .transition().duration(200)
        .attr("fill", d => colorScale(d.total_complaints)),
      exit => exit.remove() // squares that no longer match data are removed
    );
  }

  // Draw Color Legend
  const legendWidth = 300;
  const legendHeight = 15;

  const legendSvg = d3.select("body") // Add svg object for legend
    .append("svg")
    .attr("width", legendWidth + 80)
    .attr("height", 60)
    .attr("class", "legend");

  const legendGroup = legendSvg.append("g")
    .attr("transform", "translate(40,20)");

  // Create a gradient for the legend
  const defs = legendSvg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  linearGradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", d => d)
    .attr("stop-color", d => colorScale(d * maxComplaints));

  // Draw legend rectangle
  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  // Add numeric axis under legend
  const legendScale = d3.scaleLinear()
    .domain([0, maxComplaints])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(6)
    .tickSize(legendHeight + 3);

  legendGroup.append("g") // Position and draw legend
    .attr("transform", `translate(0,${legendHeight})`)
    .call(legendAxis)
    .call(g => g.select(".domain").remove());

  legendGroup.append("text") // Add legend title
    .attr("x", legendWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Total Complaints");

  // Initialize heatmap on page load
  updateHeatmap(+yearSlider.value);

  // Add eventListener to slider
  yearSlider.addEventListener("input", e => {
    updateHeatmap(+e.target.value);
  });
});


