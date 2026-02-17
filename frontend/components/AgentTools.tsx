"use client";

import { useCopilotAction } from "@copilotkit/react-core";

const MOCK_WEATHER: Record<string, { temp: number; condition: string; humidity: number }> = {
  tokyo: { temp: 22, condition: "Partly Cloudy", humidity: 65 },
  london: { temp: 14, condition: "Rainy", humidity: 85 },
  "new york": { temp: 18, condition: "Sunny", humidity: 45 },
  paris: { temp: 16, condition: "Overcast", humidity: 70 },
  sydney: { temp: 28, condition: "Clear", humidity: 55 },
};

function getWeather(location: string) {
  const key = location.toLowerCase();
  return MOCK_WEATHER[key] || {
    temp: Math.floor(Math.random() * 30) + 5,
    condition: ["Sunny", "Cloudy", "Rainy", "Windy"][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 60) + 30,
  };
}

export function AgentTools() {
  // Weather tool
  useCopilotAction({
    name: "get_weather",
    description: "Get the current weather for a given city or location. Returns temperature, condition, and humidity.",
    parameters: [
      { name: "location", type: "string", description: "The city name", required: true },
    ],
    handler: async ({ location }) => {
      await new Promise((r) => setTimeout(r, 500));
      const weather = getWeather(location);
      return JSON.stringify({ location, ...weather });
    },
    render: ({ status, args, result }) => {
      console.log("Weather render status:", status, "args:", args, "result:", result);

      if (status === "inProgress" || status === "executing") {
        return (
          <div className="loading-card">
            <div className="spinner" />
            <span>Fetching weather for {args?.location || "..."}...</span>
          </div>
        );
      }

      if (status === "complete" && result) {
        try {
          const data = typeof result === "string" ? JSON.parse(result) : result;
          console.log("Weather data parsed:", data);
          return (
            <div className="weather-card">
              <h3>{data.location || "Unknown Location"}</h3>
              <div className="temp">{data.temp || "N/A"}°C</div>
              <div className="condition">{data.condition || "N/A"}</div>
              <div style={{ color: "#6b8ab8", fontSize: 13, marginTop: 4 }}>
                Humidity: {data.humidity || "N/A"}%
              </div>
            </div>
          );
        } catch (error) {
          console.error("Weather parse error:", error);
          return (
            <div className="weather-card">
              <h3>Error</h3>
              <div style={{ color: "#ff6b6b", fontSize: 14 }}>
                Failed to parse weather data
              </div>
            </div>
          );
        }
      }

      // Debug: show what status we're in if not complete
      if (status) {
        return (
          <div className="loading-card">
            <span style={{ color: "#ff6b6b" }}>Debug: Status is "{status}"</span>
          </div>
        );
      }

      console.log("Weather render: returning null, status:", status);
      return null;
    },
  });

  // Chart tool
  useCopilotAction({
    name: "create_chart",
    description: "Create and display a bar chart with labeled data points. Use this when the user asks for charts, graphs, or data visualization.",
    parameters: [
      { name: "title", type: "string", description: "Chart title", required: true },
      {
        name: "data",
        type: "object[]",
        description: "Array of data points with label and value",
        required: true,
        attributes: [
          { name: "label", type: "string", description: "Data point label", required: true },
          { name: "value", type: "number", description: "Data point value", required: true },
        ],
      },
    ],
    handler: async ({ title, data }) => {
      return JSON.stringify({ title, data });
    },
    render: ({ status, args, result }) => {
      console.log("Chart render status:", status, "args:", args, "result:", result);
      if (status === "inProgress" || status === "executing") {
        return (
          <div className="loading-card">
            <div className="spinner" />
            <span>Creating chart{args?.title ? `: ${args.title}` : ""}...</span>
          </div>
        );
      }
      if (status === "complete" && result) {
        const data = typeof result === "string" ? JSON.parse(result) : result;
        const items = data.data || [];
        console.log("Chart data items:", items);
        const maxVal = Math.max(...items.map((d: { value: number }) => d.value), 1);
        console.log("Chart maxVal:", maxVal);
        return (
          <div className="chart-container">
            <h3>{data.title}</h3>
            <div className="bar-chart">
              {items.map((item: { label: string; value: number }, i: number) => {
                const heightPercent = (item.value / maxVal) * 100;
                console.log(`Bar ${i}: ${item.label} = ${item.value} (${heightPercent}%)`);
                return (
                  <div
                    key={i}
                    className="bar"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <span className="bar-value">{item.value}</span>
                    <span className="bar-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      console.log("Chart render: returning null");
      return null;
    },
  });

  // Image tool
  useCopilotAction({
    name: "show_image",
    description: "Display an image card with a caption. Use this when the user asks to see an image or picture.",
    parameters: [
      { name: "caption", type: "string", description: "Image caption/description", required: true },
      { name: "query", type: "string", description: "Search query for the image topic", required: true },
    ],
    handler: async ({ caption, query }) => {
      const url = `https://picsum.photos/seed/${encodeURIComponent(query)}/600/400`;
      return JSON.stringify({ caption, url });
    },
    render: ({ status, args, result }) => {
      console.log("Image render status:", status, "args:", args, "result:", result);

      if (status === "inProgress" || status === "executing") {
        return (
          <div className="loading-card">
            <div className="spinner" />
            <span>Loading image{args?.caption ? `: ${args.caption}` : ""}...</span>
          </div>
        );
      }

      if (status === "complete" && result) {
        try {
          const data = typeof result === "string" ? JSON.parse(result) : result;
          console.log("Image data parsed:", data);
          return (
            <div className="image-card">
              <img src={data.url} alt={data.caption} />
              <div className="caption">{data.caption}</div>
            </div>
          );
        } catch (error) {
          console.error("Image parse error:", error);
          return (
            <div className="loading-card">
              <span style={{ color: "#ff6b6b" }}>Error loading image</span>
            </div>
          );
        }
      }

      // Debug: show status if not complete
      if (status) {
        return (
          <div className="loading-card">
            <span style={{ color: "#ff6b6b" }}>Debug: Status is "{status}"</span>
          </div>
        );
      }

      console.log("Image render: returning null");
      return null;
    },
  });

  return null;
}
