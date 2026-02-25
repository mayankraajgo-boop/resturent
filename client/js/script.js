/* ===============================
   GLOBAL VARIABLES
=================================*/

let cart = [];
let total = 0;


/* ===============================
   LOAD ITEMS
=================================*/

window.addEventListener("DOMContentLoaded", () => {
    loadItems();
    updateCartCount();
});

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
    if (item) {
        item.quantity++;
        updateCart();
    }
}

function decreaseQty(name) {

    let item = cart.find(p => p.name === name);
    if (!item) return;

    if (item.quantity > 1) {
        item.quantity--;
    } else {
        removeItem(name);
        return;
    }

    updateCart();
}

function removeItem(name) {
    cart = cart.filter(p => p.name !== name);
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
                <div>
                    <strong>${item.name}</strong><br>
                    ₹${item.price} x ${item.quantity}
                </div>

                <div class="qty-controls">
                    <button onclick="decreaseQty('${item.name}')">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="increaseQty('${item.name}')">+</button>
                    <button class="remove-btn" onclick="removeItem('${item.name}')">❌</button>
                </div>
            </div>
        `;
    });

    const totalElement = document.getElementById("totalPrice");
    if (totalElement) {
        totalElement.innerText = total;
    }

    updateCartCount();
}


function updateCartCount() {

    const countElement = document.getElementById("cartCount");
    if (!countElement) return;

    let totalItems = 0;

    cart.forEach(item => {
        totalItems += item.quantity;
    });

    countElement.innerText = totalItems;
}


/* ===============================
   ORDER SECTION
=================================*/

async function sendOrder() {

    let name = document.getElementById("customerName").value;
    let phone = document.getElementById("customerPhone").value;
    let address = document.getElementById("customerAddress").value;
    let paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!name || !phone || !address) {
        alert("Fill all details");
        return;
    }

    if (paymentMethod === "COD") {

        await saveOrderToDB(name, phone, address, "COD");
        alert("Order Placed Successfully (Cash on Delivery)");

        return;
    }

    // ===== RAZORPAY FLOW =====

    const res = await fetch("/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total })
    });

    const data = await res.json();

    const options = {
        key: "rzp_test_SKGrADd2eDINDu",
        amount: data.amount,
        currency: "INR",
        name: "MR Restaurant",
        description: "Food Order Payment",
        order_id: data.id,
        handler: async function (response) {

            await saveOrderToDB(name, phone, address, "ONLINE");

            alert("Payment Successful!");
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

async function saveOrderToDB(name, phone, address, paymentType) {

    await fetch("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customerName: name,
            phone: phone,
            address: address,
            items: cart,
            total: total,
            payment: paymentType
        })
    });

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


function scrollToCart() {
    document.getElementById("cart").scrollIntoView({
        behavior: "smooth"
    });
}
function payNow() {
  fetch("/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 500 }),
  })
    .then(res => res.json())
    .then(order => {
      var options = {
        key: "rzp_test_SKGrADd2eDINDu", // ONLY KEY ID
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        handler: function (response) {
          alert("Payment Successful");
        },
      };

      var rzp = new Razorpay(options);
      rzp.open();
    });
}


// ===== COD CONFIRM =====
async function confirmCOD() {

    let name = document.getElementById("customerName").value;
    let phone = document.getElementById("customerPhone").value;
    let address = document.getElementById("customerAddress").value;

    if (!name || !phone || !address) {
        alert("Please fill all details");
        return;
    }

    await saveOrderToDB(name, phone, address, "COD");

    alert("Order Placed Successfully (Cash on Delivery)");
}


// ===== RAZORPAY PAYMENT =====
async function payNow() {

    let name = document.getElementById("customerName").value;
    let phone = document.getElementById("customerPhone").value;
    let address = document.getElementById("customerAddress").value;

    if (!name || !phone || !address) {
        alert("Please fill all details");
        return;
    }

    const res = await fetch("/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total })
    });

    const data = await res.json();

    const options = {
        key: "rzp_test_SKGrADd2eDINDu",
        amount: data.amount,
        currency: "INR",
        name: "MR Restaurant",
        description: "Food Order Payment",
        order_id: data.id,
        handler: async function (response) {

            await saveOrderToDB(name, phone, address, "ONLINE");

            alert("Payment Successful!");
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}


// ===== Save Order Function =====
async function saveOrderToDB(name, phone, address, paymentType) {

    await fetch("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customerName: name,
            phone: phone,
            address: address,
            items: cart,
            total: total,
            payment: paymentType
        })
    });

    cart = [];
    updateCart();
}