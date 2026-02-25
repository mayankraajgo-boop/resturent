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
// DASHBOARD STATS
// =====================
async function loadDashboardStats() {

    const res = await fetch("/admin/stats");
    const data = await res.json();

    document.querySelector(".green p").innerText = "₹ " + data.totalRevenue;
    document.querySelector(".purple p").innerText = data.totalOrders;
    document.querySelector(".red p").innerText = data.pendingOrders;

    const avg = data.totalOrders > 0
        ? Math.floor(data.totalRevenue / data.totalOrders)
        : 0;

    document.querySelector(".blue p").innerText = "₹ " + avg;
}

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
// ORDERS
// =====================
async function loadOrders() {

    const res = await fetch("/orders");
    const data = await res.json();

    const container = document.getElementById("ordersList");
    container.innerHTML = "";

    data.forEach(order => {
        container.innerHTML += `
            <div class="admin-item">
                <div>
                    <strong>${order.customerName}</strong><br>
                    ₹${order.total} | ${order.payment}<br>
                    Status: ${order.status}
                </div>
                <div>
                    ${order.status === "Pending"
                        ? `<button onclick="markDelivered('${order._id}')">Mark Delivered</button>`
                        : `<span style="color:green;">Delivered</span>`
                    }
                </div>
            </div>
        `;
    });
}

async function markDelivered(id) {
    await fetch(`/order-status/${id}`, { method: "PUT" });
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