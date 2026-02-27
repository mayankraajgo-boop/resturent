/* ===============================
   GLOBAL VARIABLES
=================================*/

let cart = [];
let total = 0;


/* ===============================
   INITIAL LOAD
=================================*/

window.addEventListener("DOMContentLoaded", () => {
    loadItems();
    updateCartCount();
});


const phoneInput = document.getElementById("customerPhone");

if (phoneInput) {

    phoneInput.addEventListener("input", function () {

        // Remove non-numeric characters
        this.value = this.value.replace(/[^0-9]/g, "");

        // Limit to 10 digits
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }

        // First digit restriction (6-9 only)
        if (this.value.length === 1 && !/[6-9]/.test(this.value)) {
            this.value = "";
        }

    });

}

/* ===============================
   LOAD ITEMS
=================================*/

let allItems = [];   // Store all items globally

async function loadItems() {

    const res = await fetch("/items");
    const data = await res.json();

    allItems = data;   // Save items

    displayItems(allItems);
}

function displayItems(items) {

    const container = document.getElementById("foodContainer");
    if (!container) return;

    container.innerHTML = "";

    items.forEach(item => {
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


// Filter function 

function filterItems(category) {

    const buttons = document.querySelectorAll(".category-filter button");

    buttons.forEach(btn => btn.classList.remove("active-filter"));

    event.target.classList.add("active-filter");

    if (category === "All") {
        displayItems(allItems);
    } else {
        const filtered = allItems.filter(item =>
            item.category === category
        );
        displayItems(filtered);
    }
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
    if (totalElement) totalElement.innerText = total;

    updateCartCount();
}

function updateCartCount() {

    const countElement = document.getElementById("cartCount");
    if (!countElement) return;

    countElement.innerText =
        cart.reduce((sum, item) => sum + item.quantity, 0);
}


/* ===============================
   ORDER SECTION
=================================*/




/* ===============================
   RAZORPAY PAYMENT
=================================*/

async function placeOrder() {

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const street = document.getElementById("customerStreet").value.trim();
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

    if (!name || !phone || !address || !street) {
        alert("Please fill all details");
        return;
    }

    // 🔥 STRICT PHONE VALIDATION
    const phonePattern = /^[6-9]\d{9}$/;

    if (!phonePattern.test(phone)) {
        alert("Enter valid 10 digit Indian mobile number starting with 6-9");
        return;
    }

    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }

    // ===== COD FLOW =====
    if (paymentMethod === "COD") {

        const orderId = await saveOrderToDB(name, phone, address, street, "COD");

        showSuccessModal(orderId);

        cart = [];
        updateCart();

        return;
    }

    // ===== ONLINE FLOW =====
    if (paymentMethod === "ONLINE") {

        const res = await fetch("/create-razorpay-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: total })
        });

        const data = await res.json();

        const options = {
            key: "rzp_test_SKGrADd2eDINDu", // replace with your test key
            amount: data.amount,
            currency: "INR",
            name: "MR Restaurant",
            description: "Food Order Payment",
            order_id: data.id,

            handler: async function () {

                const orderId = await saveOrderToDB(
                    name,
                    phone,
                    address,
                    street,
                    "ONLINE"
                );

                showSuccessModal(orderId);

                cart = [];
                updateCart();
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    }
}


/* ===============================
   SAVE ORDER FUNCTION
=================================*/

async function saveOrderToDB(name, phone, address, street, paymentType) {

    const res = await fetch("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customerName: name,
            phone: phone,
            address: address,
            street: street,
            items: cart,
            total: total,
            payment: paymentType
        })
    });

    const data = await res.json();
    return data._id;
}


/* ===============================
   SCROLL FUNCTIONS
=================================*/

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


/* ===============================
   TRACK ORDER FEATURE
=================================*/

function openTrackOrder() {
    document.getElementById("trackModal").style.display = "flex";
}

function closeTrackOrder() {
    document.getElementById("trackModal").style.display = "none";
}

async function trackOrder() {

    const orderId = document.getElementById("trackOrderId").value;
    const phone = document.getElementById("trackPhone").value;

    if (!orderId || !phone) {
        alert("Enter Order ID and Phone");
        return;
    }

    const res = await fetch("/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone })
    });

    const data = await res.json();
    const resultBox = document.getElementById("trackResult");

    if (res.status !== 200) {
        resultBox.innerHTML = "❌ Order not found";
        return;
    }

    // 🔥 DELIVERY PROGRESS LOGIC
    const steps = ["Processing", "Cooking", "Out for Delivery", "Delivered"];
    const currentStep = steps.indexOf(data.status);

    let progressHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                ${steps.map((step, index) => 
                    `<div class="progress-step ${index <= currentStep ? "active" : ""}"></div>`
                ).join("")}
            </div>
            <div class="progress-labels">
                <span>Processing</span>
                <span>Cooking</span>
                <span>Out</span>
                <span>Delivered</span>
            </div>
        </div>
    `;

    resultBox.innerHTML = `
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Total:</strong> ₹${data.total}</p>

        ${progressHTML}

        <button onclick="copyOrderId('${orderId}')">
            Copy Order ID
        </button>

        <a href="https://wa.me/919761492765?text=Hello%20I%20want%20to%20track%20my%20order%20ID%20${orderId}" target="_blank">
            <button style="background:#25D366;color:white;margin-top:10px;">
                WhatsApp Support
            </button>
        </a>

        <a href="tel:+919761492765">
            <button style="background:#111;color:white;margin-top:10px;">
                Call Restaurant
            </button>

        </a>
    `;
}
function copyOrderId(orderId) {

    navigator.clipboard.writeText(orderId)
        .then(() => {
            alert("Order ID Copied!");
        })
        .catch(() => {
            alert("Copy failed");
        });
}

let orderCopied = false;

function showSuccessModal(orderId) {

    orderCopied = false;

    document.getElementById("successOrderId").innerText = orderId;

    const whatsappLink =
        "https://wa.me/919761492765?text=Hello%20I%20have%20placed%20an%20order.%20My%20Order%20ID%20is%20" + orderId;

    document.getElementById("whatsappBtn").href = whatsappLink;

    document.getElementById("orderSuccessModal").style.display = "flex";
}

function copySuccessOrderId() {

    const orderId =
        document.getElementById("successOrderId").innerText;

    navigator.clipboard.writeText(orderId)
        .then(() => {
            alert("Order ID Copied Successfully!");
            orderCopied = true;
        });
}

function closeSuccessModal() {

    if (!orderCopied) {
        alert("⚠ Please copy your Order ID before closing.");
        return;
    }

    document.getElementById("orderSuccessModal").style.display = "none";

    // Now safe to reload
    window.location.reload();
}

async function placeOrder() {

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const street = document.getElementById("customerStreet").value.trim();

    const paymentRadio = document.querySelector('input[name="payment"]:checked');

    if (!name || !phone || !address || !street) {
        alert("Please fill all details");
        return;
    }

    // Strict phone validation
    const phonePattern = /^[6-9]\d{9}$/;

    if (!phonePattern.test(phone)) {
        alert("Enter valid 10 digit Indian number starting with 6-9");
        return;
    }

    if (!paymentRadio) {
        alert("Select payment method");
        return;
    }

    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }

    const paymentMethod = paymentRadio.value;

    // ===== COD =====
    if (paymentMethod === "COD") {

        const orderId = await saveOrderToDB(name, phone, address, street, "COD");

        showSuccessModal(orderId);

        cart = [];
        updateCart();
        return;
    }

    // ===== ONLINE =====
    if (paymentMethod === "ONLINE") {

        const res = await fetch("/create-razorpay-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: total })
        });

        const data = await res.json();

        const options = {
            key: "rzp_test_SKGrADd2eDINDu",  // replace with your test key
            amount: data.amount,
            currency: "INR",
            name: "MR Restaurant",
            description: "Food Order Payment",
            order_id: data.id,
            handler: async function () {

                const orderId = await saveOrderToDB(
                    name,
                    phone,
                    address,
                    street,
                    "ONLINE"
                );

                showSuccessModal(orderId);

                cart = [];
                updateCart();
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    }
}