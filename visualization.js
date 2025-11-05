// Import D3
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Select SVG element
const svg = d3.select("#heatmap");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Select yearSlider & yearLabel html elements
const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");

// Color scale setup
const colorScale = d3.scaleSequential(d3.interpolateYlOrRd);

// Load data from JSON & GeoJSON
Promise.all([
  d3.json("data/complaints_by_precinct.json"),
  d3.json("data/nyc_precincts.geojson")
]).then(([data, geoData]) => {
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

// Map projection and path generator
const projection = d3.geoMercator()
  .fitSize([width, height], geoData);

const path = d3.geoPath().projection(projection);

// Draw Heatmap
function updateHeatmap(selectedYear) {
  yearLabel.textContent = selectedYear; // update label next to slider

  const yearRows = data.filter(d => d.year_received === +selectedYear); // rows for this year only
  const byPrecinct = new Map(yearRows.map(d => [d.precinct, d.total_complaints])); // lookup: precinct -> total

  geoData.features.forEach(f => { // attach totals into geojson for this year
    const p = String(f.properties.precinct);
    f.properties.total_complaints = byPrecinct.get(p) ?? 0; // 0 if no data
  });

  const precinctPaths = svg.selectAll(".precinct") // bind polygons to svg
    .data(geoData.features, d => String(d.properties.precinct));

  precinctPaths.join(
    enter => enter.append("path") // draw precinct for first time
      .attr("class", "precinct")
      .attr("d", path)
      .attr("fill", d => colorScale(d.properties.total_complaints))
      .append("title") // tooltip on hover
      .text(d => `Precinct: ${d.properties.precinct}\nComplaints: ${d.properties.total_complaints}`),

    update => update // recolor on year change
      .transition().duration(200)
      .attr("fill", d => colorScale(d.properties.total_complaints)),

    exit => exit.remove() // not used in geo but kept for consistency
  );

  svg.selectAll(".precinct title") // refresh tooltip text when slider moves
    .text(d => `Precinct: ${d.properties.precinct}\nComplaints: ${d.properties.total_complaints}`);
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


