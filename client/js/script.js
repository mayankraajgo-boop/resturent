let cart = [];
let total = 0;


/* ===============================
   LOAD ITEMS
=================================*/

window.addEventListener("DOMContentLoaded", loadItems);

async function loadItems() {

    const res = await fetch("/items");
    const data = await res.json();

    const container = document.getElementById("foodContainer");
    if (!container) return;

    container.innerHTML = "";

    data.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>₹${item.price}</p>
                <button onclick="addToCart('${item.name}', ${item.price})">
                    Add To Cart
                </button>
            </div>
        `;
    });
}

/* ===============================
   CART LOGIC
=================================*/

function addToCart(name, price) {

    let item = cart.find(p => p.name === name);

    if (item) {
        item.quantity++;
    } else {
        cart.push({ name, price, quantity: 1 });
    }

    updateCart();
}

function increaseQty(name) {
    let item = cart.find(p => p.name === name);
    if (item) item.quantity++;
    updateCart();
}

function decreaseQty(name) {

    let item = cart.find(p => p.name === name);

    if (!item) return;

    if (item.quantity > 1) {
        item.quantity--;
    } else {
        cart = cart.filter(p => p.name !== name);
    }

    updateCart();
}

function updateCart() {

    const cartDiv = document.getElementById("cartItems");
    if (!cartDiv) return;

    cartDiv.innerHTML = "";
    total = 0;

    cart.forEach(item => {

        total += item.price * item.quantity;

        cartDiv.innerHTML += `
            <div class="cart-item">
                <strong>${item.name}</strong>
                ₹${item.price} x ${item.quantity}
                <button onclick="decreaseQty('${item.name}')">-</button>
                <button onclick="increaseQty('${item.name}')">+</button>
            </div>
        `;
    });

    document.getElementById("totalPrice").innerText = total;
}

/* ===============================
   ORDER SUBMIT
=================================*/

async function sendOrder() {

    let name = document.getElementById("customerName").value;
    let phone = document.getElementById("customerPhone").value;
    let address = document.getElementById("customerAddress").value;

    if (!name || !phone || !address) {
        alert("Fill all details");
        return;
    }

    await fetch("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customerName: name,
            phone: phone,
            address: address,
            items: cart,
            total: total,
            payment: "Cash"
        })
    });

    alert("Order Placed Successfully!");

    cart = [];
    updateCart();
}
function openOrderForm() {

    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const form = document.getElementById("orderForm");
    form.style.display = "block";

    form.scrollIntoView({
        behavior: "smooth"
    });
}