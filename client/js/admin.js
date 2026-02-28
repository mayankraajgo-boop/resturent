// =====================
// PROTECT ADMIN
// =====================
const token = localStorage.getItem("adminToken");
if (!token || token !== "secure-admin-token") {
    window.location.href = "/admin-login.html";
}

document.querySelector(".logout-btn").addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin-login.html";
});

// =====================
// SIDEBAR NAVIGATION
// =====================
function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.style.display = "none";
    });

    document.getElementById(id).style.display = "block";
}

// =====================
// DASHBOARD STATS WITH REAL-TIME DATA
// =====================
async function loadDashboardStats() {

    const res = await fetch("/admin/stats");
    const data = await res.json();

    document.getElementById("totalRevenue").innerText = "₹ " + data.totalRevenue;
    document.getElementById("totalOrders").innerText = data.totalOrders;
    document.getElementById("pendingOrders").innerText = data.pendingOrders;

    const avg = data.totalOrders > 0
        ? Math.floor(data.totalRevenue / data.totalOrders)
        : 0;

    document.getElementById("avgRevenue").innerText = "₹ " + avg;

    // Load today's stats
    loadTodayStats();
}

// =====================
// TODAY'S STATS (REAL-TIME)
// =====================
async function loadTodayStats() {
    const res = await fetch("/orders");
    const orders = await res.json();

    const today = new Date().toDateString();
    
    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toDateString();
        return orderDate === today;
    });

    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const completedToday = todayOrders.filter(o => o.status === "Delivered").length;

    document.getElementById("todayOrders").innerText = todayOrders.length;
    document.getElementById("todayRevenue").innerText = "₹ " + todayRevenue;
    document.getElementById("completedToday").innerText = completedToday;
}

// =====================
// AUTO-REFRESH EVERY 10 SECONDS
// =====================
setInterval(() => {
    loadDashboardStats();
    loadOrders();
}, 10000); // Refresh every 10 seconds

// =====================
// CHARTS
// =====================
new Chart(document.getElementById("salesChart"), {
    type: "doughnut",
    data: {
        labels: ["Revenue", "Remaining"],
        datasets: [{
            data: [70, 30],
            backgroundColor: ["#22c55e", "#ef4444"]
        }]
    }
});

new Chart(document.getElementById("ordersChart"), {
    type: "bar",
    data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        datasets: [{
            label: "Orders",
            data: [5, 8, 3, 6, 10],
            backgroundColor: "#facc15"
        }]
    }
});

// =====================
// LOAD ITEMS
// =====================
let editId = null;

async function loadItems() {

    const res = await fetch("/items");
    const data = await res.json();

    const container = document.getElementById("adminItems");
    container.innerHTML = "";

    data.forEach(item => {
        container.innerHTML += `
            <div class="admin-item">
                <img src="${item.image}">
                <div>
                    <strong>${item.name}</strong><br>
                    ₹${item.price} | ${item.category}
                </div>
                <div>
                    <button onclick="startEdit('${item._id}','${item.name}',${item.price},'${item.category}')">Edit</button>
                    <button onclick="deleteItem('${item._id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

// ADD / UPDATE
async function addItem() {

    const name = document.getElementById("itemName").value;
    const price = document.getElementById("itemPrice").value;
    const category = document.getElementById("itemCategory").value;
    const image = document.getElementById("itemImage").files[0];

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    if (image) formData.append("image", image);

    if (editId) {
        await fetch(`/update-item/${editId}`, {
            method: "PUT",
            body: formData
        });
        editId = null;
        document.getElementById("addBtn").innerText = "Add Item";
        document.getElementById("cancelBtn").style.display = "none";
    } else {
        await fetch("/add-item", {
            method: "POST",
            body: formData
        });
    }

    clearForm();
    loadItems();
}

function startEdit(id, name, price, category) {

    editId = id;

    document.getElementById("itemName").value = name;
    document.getElementById("itemPrice").value = price;
    document.getElementById("itemCategory").value = category;

    document.getElementById("addBtn").innerText = "Update Item";
    document.getElementById("cancelBtn").style.display = "inline-block";
}

function cancelEdit() {
    editId = null;
    clearForm();
    document.getElementById("addBtn").innerText = "Add Item";
    document.getElementById("cancelBtn").style.display = "none";
}

async function deleteItem(id) {
    await fetch(`/delete-item/${id}`, { method: "DELETE" });
    loadItems();
}

function clearForm() {
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    document.getElementById("itemCategory").value = "";
    document.getElementById("itemImage").value = "";
}

// =====================
// ORDERS WITH REAL-TIME UPDATES
// =====================
let allOrders = [];

async function loadOrders() {
    const res = await fetch("/orders");
    allOrders = await res.json();
    displayOrders(allOrders);
}

function displayOrders(orders) {
    const container = document.getElementById("ordersList");
    container.innerHTML = "";

    if (orders.length === 0) {
        container.innerHTML = "<p style='text-align:center;color:#94a3b8;'>No orders found</p>";
        return;
    }

    orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleString();
        
        container.innerHTML += `
            <div class="order-box ${order.status.toLowerCase().replace(/\s/g, '-')}">
                <div class="order-header">
                    <strong>🧑 ${order.customerName}</strong>
                    <span class="order-id">ID: ${order._id.slice(-6)}</span>
                </div>
                <div class="order-details">
                    <p>📞 ${order.phone}</p>
                    <p>📍 ${order.address}, ${order.street}</p>
                    <p>💰 ₹${order.total} | ${order.payment}</p>
                    <p>🕒 ${orderDate}</p>
                </div>
                <div class="order-actions">
                    <select onchange="updateStatus('${order._id}', this.value)" class="status-select">
                        <option ${order.status === "Processing" ? "selected" : ""}>Processing</option>
                        <option ${order.status === "Cooking" ? "selected" : ""}>Cooking</option>
                        <option ${order.status === "Out for Delivery" ? "selected" : ""}>Out for Delivery</option>
                        <option ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
                    </select>
                    <button onclick="viewOrderDetails('${order._id}')" class="view-btn">View Items</button>
                </div>
            </div>
        `;
    });
}

// =====================
// SEARCH & FILTER ORDERS
// =====================
function filterOrders() {
    const searchTerm = document.getElementById("searchOrder").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value;

    let filtered = allOrders;

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.customerName.toLowerCase().includes(searchTerm) ||
            order.phone.includes(searchTerm) ||
            order._id.includes(searchTerm)
        );
    }

    // Filter by status
    if (statusFilter) {
        filtered = filtered.filter(order => order.status === statusFilter);
    }

    displayOrders(filtered);
}

// =====================
// VIEW ORDER DETAILS
// =====================
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o._id === orderId);
    if (!order) return;

    const itemsList = order.items.map(item => 
        `${item.name} x${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');

    alert(`Order Details:\n\n${itemsList}\n\nTotal: ₹${order.total}`);
}

async function updateStatus(id, status) {
    await fetch(`/order-status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    });

    loadOrders();
    loadDashboardStats();
}

// =====================
// INITIAL LOAD
// =====================
window.onload = () => {
    loadDashboardStats();
    loadItems();
    loadOrders();
};