import React, { useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import XMLParser from "react-xml-parser";
import "leaflet/dist/leaflet.css";
import { ScatterChart, Scatter, XAxis, YAxis } from "recharts";

const App = () => {
  const [positions, setPositions] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [elevations, setElevations] = useState([]);

  const getDistance = ([lat1, lon1], [lat2, lon2]) => {
    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }

    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return Math.floor(d * 100);
  };

  const onChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (e) => {
      const xml = new XMLParser().parseFromString(e.target.result);
      const trkpts = xml.getElementsByTagName("trkpt");
      const { positions, elevations } = trkpts.reduce(
        (acc, trkpt) => {
          acc.positions.push([trkpt.attributes.lat, trkpt.attributes.lon]);

          let distance;
          //  이전 포지션과 현재 trkpt의 길이 계산
          if (acc.positions.length > 1) {
            const prevPosition = acc.positions[acc.positions.length - 2];
            const currentPosition = [
              trkpt.attributes.lat,
              trkpt.attributes.lon,
            ];
            distance = getDistance(prevPosition, currentPosition);
          } else {
            distance = 0;
          }

          if (acc.elevations.length > 0) {
            distance += acc.elevations[acc.elevations.length - 1][1];
          }

          acc.elevations.push([Math.floor(trkpt.children[0].value), distance]);

          return acc;
        },
        { positions: [], elevations: [] }
      );

      const wpt = xml.getElementsByTagName("wpt");
      const waypoints = wpt.map((wpt) => {
        return [wpt.attributes.lat, wpt.attributes.lon, wpt.children[0].value];
      });
      setPositions([]);

      setTimeout(() => {
        setElevations(elevations);
        setWaypoints(waypoints);
        setPositions(positions);
      }, 100);
    };
  };

  const getCoordinate = () => {
    const { lat, lon } = positions.reduce(
      (acc, position) => {
        acc.lat.push(position[0]);
        acc.lon.push(position[1]);
        return acc;
      },
      { lat: [], lon: [] }
    );
    const minLat = Math.min(...lat);
    const maxLat = Math.max(...lat);
    const minLon = Math.min(...lon);
    const maxLon = Math.max(...lon);

    return { minLat, maxLat, minLon, maxLon };
  };

  const getCenter = () => {
    if (positions.length === 0) {
      return [0, 0];
    }
    const { minLat, maxLat, minLon, maxLon } = getCoordinate();
    return [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
  };

  const getZoom = () => {
    if (positions.length === 0) {
      return 1;
    }
    const { minLat, maxLat, minLon, maxLon } = getCoordinate();
    const latDiff = maxLat - minLat;
    const lonDiff = maxLon - minLon;
    const diff = Math.max(latDiff, lonDiff);

    if (diff < 0.05) {
      return 13;
    } else if (diff < 0.1) {
      return 12;
    } else if (diff < 0.3) {
      return 11;
    } else if (diff < 0.6) {
      return 10;
    } else if (diff < 1) {
      return 9;
    } else if (diff < 2) {
      return 8;
    } else if (diff < 5) {
      return 7;
    } else if (diff < 10) {
      return 6;
    } else if (diff < 20) {
      return 5;
    } else if (diff < 50) {
      return 4;
    } else if (diff < 100) {
      return 3;
    } else {
      return 2;
    }
  };

  return (
    <div>
      <div style={{ margin: "20px" }}>
        <input type="file" onChange={onChange} />
      </div>
      <div style={{ margin: "20px" }}>
        {positions.length > 0 && (
          <MapContainer
            center={getCenter()}
            zoom={getZoom()}
            scrollWheelZoom={false}
            style={{
              height: "calc(100vh - 400px)",
              width: "calc(100vw - 40px)",
            }} // Add a height
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline
              pathOptions={{ fillColor: "red", color: "#f03e3e" }}
              positions={positions}
            />
            {waypoints.length > 0 &&
              waypoints.map((waypoint, index) => (
                <CircleMarker
                  key={index}
                  center={[waypoint[0], waypoint[1]]}
                  radius={3}
                  pathOptions={{ color: "#4263eb" }}
                >
                  <Tooltip>{waypoint[2]}</Tooltip>
                </CircleMarker>
              ))}
            <CircleMarker
              key="start"
              center={positions[0]}
              radius={4}
              pathOptions={{ color: "#f03e3e" }}
            >
              <Tooltip direction="top">출발</Tooltip>
            </CircleMarker>
            <CircleMarker
              key="end"
              center={positions[positions.length - 1]}
              radius={4}
              pathOptions={{ color: "#f03e3e" }}
            >
              <Tooltip direction="bottom">도착</Tooltip>
            </CircleMarker>
          </MapContainer>
        )}
      </div>
      <div
        style={{ margin: "20px", width: "calc(100vw - 40px)", height: "400px" }}
      >
        {elevations.length > 0 && (
          <ScatterChart
            width={1500}
            height={300}
            data={elevations.reduce((acc, cur, i) => {
              if (elevations.length > 1000) {
                if (i % 10 === 0) {
                  acc.push({ x: cur[1], y: cur[0] });
                }
              } else if (elevations.length > 400) {
                if (i % 5 === 0) {
                  acc.push({ x: cur[1], y: cur[0] });
                }
              } else if (elevations.length > 200) {
                if (i % 3 === 0) {
                  acc.push({ x: cur[1], y: cur[0] });
                }
              } else {
                acc.push({ x: cur[1], y: cur[0] });
              }
              return acc;
            }, [])}
          >
            <YAxis type="number" dataKey="y" name="고도" unit="r" />
            <XAxis type="number" dataKey="x" name="거리" unit="m" />
            <Scatter name="A school" fill="#8884d8" line />
          </ScatterChart>
        )}
      </div>
    </div>
  );
};

export default App;
