const username = localStorage.getItem("username");

if (!username) {
  window.location.href = "../login/login.html";
}

document.getElementById("leaderboardBtn").onclick = () => {
    localStorage.setItem("leaderboardFrom", "../home/index.html");
    window.location.href = "../leaderboard/index.html";
};

document.getElementById("usernameDisplay").textContent =
    localStorage.getItem("username") || "username";