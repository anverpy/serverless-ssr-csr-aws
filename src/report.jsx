import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/report.json")
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div>
      <h1>CSR Report</h1>
      <table border="1">
        <thead>
          <tr>
            {data[0] && Object.keys(data[0]).map(k => <th key={k}>{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((v, j) => <td key={j}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}