const BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "";

const username = localStorage.getItem("username");
const from = localStorage.getItem("leaderboardFrom") || "../home/index.html";

// Load leaderboard
async function leaderBoard() {
    try {
        const res = await fetch(`${BASE}/api/klotski/leaderboard`);
        const data = await res.json();
        // Find <tbody> inside the table with id= "leaderboard"
        const tbody = document.querySelector("#leaderboard tbody");
        // Clear existing rows
        tbody.innerHTML = "";
        if (data.length === 0){
            tbody.innerHTML = `
                <tr>
                    <td colspan="4">No records yet</td>
                </tr>  
            `;
            return;
        }

        // For each row in data, create a new table row
        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            if (row.username === username) {
                tr.classList.add("highlight-row");
            }
            // Fill table
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${row.username}</td>
                <td>${row.best_steps}</td>
                <td>${new Date(row.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load leaderboard", err);
    } 
}

document.getElementById("backBtn").onclick = () => {
    window.location.href = from;
};

leaderBoard();