/* =========================================================
   PROFILE
   ========================================================= */

function ensureProfileScreen() {

    let screen =
        $("profile-screen");


    if (!screen) {

        screen =
            document.createElement(
                "section"
            );

        screen.id =
            "profile-screen";

        document.body.appendChild(
            screen
        );

    }


    return screen;

}


function showProfileScreen() {

    state.screen =
        "profile";


    hideDynamicScreens();


    const screen =
        ensureProfileScreen();


    screen.style.display =
        "flex";

    screen.classList.add(
        "active"
    );


    const app =
        $("app");


    if (app) {

        app.style.display =
            "none";

    }


    renderProfile();


    document.body.classList.add(
        "profile-mode"
    );

}


function renderProfile() {

    const screen =
        ensureProfileScreen();


    screen.innerHTML = `

        <div class="secondary-page">

            <header class="secondary-header">

                <button
                    type="button"
                    class="header-back-btn"
                    data-action="back-menu"
                >
                    ←
                </button>

                <h1>
                    Profile
                </h1>

                <div></div>

            </header>


            <main class="secondary-content">

                <div class="profile-card">

                    <div class="profile-avatar">
                        ●
                    </div>


                    <h2>
                        ${
                            escapeHTML(
                                state.user.name ||
                                "Juice Robo Customer"
                            )
                        }
                    </h2>


                    ${
                        state.user.phone
                            ? `
                                <p>
                                    ${escapeHTML(
                                        state.user.phone
                                    )}
                                </p>
                              `
                            : ""
                    }


                    ${
                        state.user.email
                            ? `
                                <p>
                                    ${escapeHTML(
                                        state.user.email
                                    )}
                                </p>
                              `
                            : ""
                    }

                </div>


                <div class="profile-actions">

                    <button
                        type="button"
                        class="primary-btn"
                        data-action="show-history"
                    >
                        ORDER HISTORY
                    </button>


                    <button
                        type="button"
                        class="secondary-btn"
                        data-action="show-location"
                    >
                        CHANGE LOCATION
                    </button>

                </div>

            </main>

        </div>

    `;

}


/* =========================================================
   DYNAMIC SCREENS
   ========================================================= */

function ensureDynamicScreens() {

    ensureLocationScreen();

    ensureCartScreen();

    ensureCheckoutScreen();

    ensureHistoryScreen();

    ensureConfirmationScreen();

    ensureProfileScreen();

}


/* =========================================================
   HIDE DYNAMIC SCREENS
   ========================================================= */

function hideDynamicScreens() {

    [

        "location-screen",

        "cart-screen",

        "checkout-screen",

        "history-screen",

        "confirmation-screen",

        "profile-screen"

    ].forEach(
        id => {

            const element =
                $(id);


            if (!element) {

                return;

            }


            element.style.display =
                "none";

            element.classList.remove(
                "active"
            );

            element.setAttribute(
                "aria-hidden",
                "true"
            );

        }
    );


    const app =
        $("app");


    if (app) {

        app.style.display =
            "none";

        app.classList.remove(
            "active"
        );

    }


    document.body.classList.remove(

        "location-mode",

        "menu-mode",

        "cart-mode",

        "checkout-mode",

        "confirmation-mode",

        "history-mode",

        "profile-mode"

    );

}


/* =========================================================
   BACKEND ERROR
   ========================================================= */

function showBackendError() {

    hideDynamicScreens();


    const app =
        $("app");


    if (!app) {

        return;

    }


    app.style.display =
        "flex";

    app.classList.add(
        "active"
    );


    app.innerHTML = `

        <div class="app-shell">

            <main
                class="empty-state"
                style="
                    padding:40px 22px;
                    text-align:center;
                "
            >

                <div class="empty-icon">
                    ⚠
                </div>


                <h2>
                    Menu unavailable
                </h2>


                <p>
                    We couldn't connect to the
                    Juice Robo server.
                </p>


                <button
                    type="button"
                    class="primary-btn"
                    data-action="retry-backend"
                >
                    TRY AGAIN
                </button>

            </main>

        </div>

    `;

}


/* =========================================================
   EVENT DELEGATION
   ========================================================= */

function setupEventDelegation() {

    if (
        window.__juiceRoboEventsReady
    ) {

        return;

    }


    window.__juiceRoboEventsReady =
        true;


    document.addEventListener(
        "click",
        handleGlobalClick
    );

}


/* =========================================================
   GLOBAL CLICK
   ========================================================= */

function handleGlobalClick(
    event
) {

    const target =
        event.target.closest(
            "[data-action]"
        );


    if (!target) {

        return;

    }


    const action =
        target.dataset.action;


    const productId =
        target.dataset.productId;


    const locationId =
        target.dataset.locationId;


    const orderId =
        target.dataset.orderId;


    console.log(
        "Juice Robo: Action:",
        action
    );


    switch (action) {

        case "increase":

            increaseQuantity(
                productId
            );

            break;


        case "decrease":

            decreaseQuantity(
                productId
            );

            break;


        case "show-location":

            showLocationScreen();

            break;


        case "location-back":

            if (
                state.selectedLocation
            ) {

                showMenuScreen();

            }

            break;


        case "select-location":

            selectLocation(
                locationId
            );

            break;


        case "show-cart":

            showCartScreen();

            break;


        case "back-cart":

            showCartScreen();

            break;


        case "clear-cart":

            handleClearCart();

            break;


        case "back-menu":

            showMenuScreen();

            break;


        case "checkout":

            showCheckoutScreen();

            break;


        case "place-order":

            placeOrder();

            break;


        case "show-history":

            showHistoryScreen();

            break;


        case "view-order":

            viewOrder(
                orderId
            );

            break;


        case "show-profile":

            showProfileScreen();

            break;


        case "retry-backend":

            retryBackend();

            break;


        default:

            console.warn(
                "Juice Robo: Unknown action:",
                action
            );

            break;

    }

}


/* =========================================================
   RETRY BACKEND
   ========================================================= */

async function retryBackend() {

    const loaded =
        await loadBackendData();


    if (!loaded) {

        showBackendError();

        return;

    }


    const restored =
        restoreSelectedLocation();


    if (
        restored
    ) {

        showMenuScreen();

    } else {

        showLocationScreen();

    }

}


/* =========================================================
   KEYBOARD
   ========================================================= */

function setupKeyboardSupport() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            switch (
                state.screen
            ) {

                case "cart":

                    showMenuScreen();

                    break;


                case "checkout":

                    showCartScreen();

                    break;


                case "history":

                case "confirmation":

                case "profile":

                    showMenuScreen();

                    break;


                default:

                    break;

            }

        }
    );

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    isError = false
) {

    let toast =
        $("toast");


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "toast";

        toast.className =
            "toast";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.className =
        `toast show ${
            isError
                ? "err"
                : ""
        }`;


    clearTimeout(
        showToast.timeout
    );


    showToast.timeout =
        setTimeout(
            () => {

                toast.className =
                    "toast";

            },
            2800
        );

}


/* =========================================================
   CSS.escape FALLBACK
   ========================================================= */

if (
    typeof CSS === "undefined" ||
    typeof CSS.escape !== "function"
) {

    window.CSS =
        window.CSS ||
        {};


    CSS.escape =
        function(value) {

            return String(
                value
            ).replace(
                /[^a-zA-Z0-9_\-]/g,
                "\\$&"
            );

        };

}


/* =========================================================
   PUBLIC JUICE ROBO API
   ========================================================= */

window.JuiceRobo = {

    state,

    showLocationScreen,

    showMenuScreen,

    showCartScreen,

    showCheckoutScreen,

    showConfirmationScreen:
        showOrderConfirmation,

    showHistoryScreen,

    showProfileScreen,

    selectLocation,

    increaseQuantity,

    decreaseQuantity,

    getCartItems,

    getCartItemCount,

    getCartSubtotal,

    getCartTotal,

    clearCart,

    updateCartBadge

};


/* =========================================================
   JAVASCRIPT LOADED
   ========================================================= */

console.log(
    "Juice Robo: app.js loaded successfully."
);


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp,
        {
            once: true
        }
    );

}

else {

    initializeApp();

}/* =========================================================
   LOCATION / MACHINE
   ========================================================= */

function getMachineForLocation(locationId) {

    const normalizedLocationId =
        normalizeId(locationId);

    console.log(
        "Juice Robo: Finding machine for location:",
        normalizedLocationId
    );

    /*
     * IMPORTANT:
     *
     * Location IDs are UUID strings.
     * Do NOT convert them with Number().
     */

    const onlineMachine =
        MACHINES.find(
            machine =>
                normalizeId(
                    machine.locationId
                ) === normalizedLocationId &&
                String(
                    machine.status || ""
                ).toUpperCase() === "ONLINE"
        );

    if (onlineMachine) {

        console.log(
            "Juice Robo: Online machine found:",
            onlineMachine
        );

        return onlineMachine;
    }

    /*
     * If there is no ONLINE machine,
     * fall back to any machine assigned
     * to this location.
     */

    const assignedMachine =
        MACHINES.find(
            machine =>
                normalizeId(
                    machine.locationId
                ) === normalizedLocationId
        );

    if (assignedMachine) {

        console.log(
            "Juice Robo: Assigned machine found:",
            assignedMachine
        );

        return assignedMachine;
    }

    console.warn(
        "Juice Robo: No machine assigned to location:",
        normalizedLocationId
    );

    return null;
}


/* =========================================================
   RESTORE SAVED LOCATION
   ========================================================= */

function restoreSelectedLocation() {

    if (!state.selectedLocation) {

        state.selectedMachine = null;

        return false;
    }

    const savedLocationId =
        normalizeId(
            state.selectedLocation.id
        );

    const location =
        LOCATIONS.find(
            item =>
                normalizeId(
                    item.id
                ) === savedLocationId
        );

    if (!location) {

        console.warn(
            "Juice Robo: Saved location no longer exists."
        );

        state.selectedLocation = null;
        state.selectedMachine = null;

        saveSelectedLocation();

        return false;
    }

    const machine =
        getMachineForLocation(
            location.id
        );

    if (!machine) {

        console.warn(
            "Juice Robo: No machine available for saved location."
        );

        state.selectedLocation = null;
        state.selectedMachine = null;

        saveSelectedLocation();

        return false;
    }

    state.selectedLocation = {
        ...location
    };

    state.selectedMachine = {
        ...machine
    };

    saveSelectedLocation();

    return true;
}


/* =========================================================
   LOCATION SCREEN
   ========================================================= */

function ensureLocationScreen() {

    let screen =
        $("location-screen");

    if (!screen) {

        screen =
            document.createElement("section");

        screen.id =
            "location-screen";

        document.body.appendChild(
            screen
        );
    }

    return screen;
}


/* =========================================================
   SHOW LOCATION SCREEN
   ========================================================= */

function showLocationScreen() {

    state.screen =
        "location";

    hideDynamicScreens();

    const screen =
        ensureLocationScreen();

    screen.style.display =
        "flex";

    screen.classList.add(
        "active"
    );

    screen.setAttribute(
        "aria-hidden",
        "false"
    );

    const app =
        $("app");

    if (app) {

        app.style.display =
            "none";

        app.classList.remove(
            "active"
        );
    }

    renderLocationScreen();

    document.body.classList.add(
        "location-mode"
    );
}


/* =========================================================
   RENDER LOCATION SCREEN
   ========================================================= */

function renderLocationScreen() {

    const screen =
        ensureLocationScreen();

    const activeLocations =
        LOCATIONS.filter(
            location =>
                location.isActive !== false
        );

    screen.innerHTML = `

        <div class="location-page">

            <header class="location-header">

                <button
                    type="button"
                    class="header-back-btn"
                    data-action="location-back"
                    aria-label="Back"
                >
                    ←
                </button>

                <h1>
                    Choose Location
                </h1>

                <div class="header-spacer"></div>

            </header>


            <main class="location-content">

                <div class="location-intro">

                    <div class="location-intro-icon">
                        📍
                    </div>

                    <h2>
                        Select your Juice Robo machine
                    </h2>

                    <p>
                        Choose the machine where you
                        want to collect your order.
                    </p>

                </div>


                <div class="location-list">

                    ${
                        activeLocations.length > 0

                            ? activeLocations
                                .map(
                                    renderLocationCard
                                )
                                .join("")

                            : `

                                <div class="empty-state">

                                    <h2>
                                        No locations available
                                    </h2>

                                    <p>
                                        Please try again later.
                                    </p>

                                </div>

                            `
                    }

                </div>

            </main>

        </div>

    `;
}


/* =========================================================
   LOCATION CARD
   ========================================================= */

function renderLocationCard(
    location
) {

    const machine =
        getMachineForLocation(
            location.id
        );

    const selected =
        Boolean(
            state.selectedLocation &&
            normalizeId(
                state.selectedLocation.id
            ) ===
            normalizeId(
                location.id
            )
        );

    const machineStatus =
        machine
            ? String(
                machine.status ||
                "UNKNOWN"
            ).toUpperCase()
            : "NO MACHINE";

    const machineAvailable =
        Boolean(
            machine
        );

    return `

        <article
            class="
                location-card
                ${selected ? "is-selected" : ""}
            "
        >

            <div class="location-card-icon">
                ${escapeHTML(
                    location.icon || "●"
                )}
            </div>


            <div class="location-card-details">

                <h2>
                    ${escapeHTML(
                        location.name
                    )}
                </h2>

                <p>
                    ${escapeHTML(
                        location.address
                    )}
                </p>


                <span class="location-description">

                    ${
                        machineAvailable

                            ? `
                                Machine:
                                ${escapeHTML(
                                    machine.machineCode ||
                                    machine.name ||
                                    machine.id
                                )}
                              `

                            : `
                                No machine assigned
                              `
                    }

                </span>


                <span class="location-description">

                    Status:
                    ${escapeHTML(
                        machineStatus
                    )}

                </span>

            </div>


            <button
                type="button"
                class="location-select-btn"
                data-action="select-location"
                data-location-id="${escapeAttribute(
                    location.id
                )}"
                aria-pressed="${
                    selected
                        ? "true"
                        : "false"
                }"
                ${
                    !machineAvailable
                        ? "disabled"
                        : ""
                }
            >

                ${
                    selected
                        ? "SELECTED"
                        : "SELECT"
                }

            </button>

        </article>

    `;
}


/* =========================================================
   SELECT LOCATION
   ========================================================= */

function selectLocation(
    locationId
) {

    const normalizedLocationId =
        normalizeId(
            locationId
        );

    const location =
        LOCATIONS.find(
            item =>
                normalizeId(
                    item.id
                ) === normalizedLocationId
        );

    if (!location) {

        console.error(
            "Juice Robo: Location not found:",
            locationId
        );

        showToast(
            "Location not found.",
            true
        );

        return;
    }

    const machine =
        getMachineForLocation(
            location.id
        );

    if (!machine) {

        console.warn(
            "Juice Robo: No machine available at:",
            location.name
        );

        showToast(
            "No Juice Robo machine is available at this location.",
            true
        );

        return;
    }

    state.selectedLocation = {
        ...location
    };

    state.selectedMachine = {
        ...machine
    };

    saveSelectedLocation();

    console.log(
        "Juice Robo: Location selected:",
        state.selectedLocation
    );

    console.log(
        "Juice Robo: Machine selected:",
        state.selectedMachine
    );

    showMenuScreen();
}


/* =========================================================
   MAIN MENU
   ========================================================= */

function showMenuScreen() {

    if (!state.selectedLocation) {

        showLocationScreen();

        return;
    }

    if (!state.selectedMachine) {

        state.selectedMachine =
            getMachineForLocation(
                state.selectedLocation.id
            );
    }

    if (!state.selectedMachine) {

        showToast(
            "No machine is available for this location.",
            true
        );

        showLocationScreen();

        return;
    }

    state.screen =
        "menu";

    hideDynamicScreens();

    const locationScreen =
        $("location-screen");

    if (locationScreen) {

        locationScreen.style.display =
            "none";

        locationScreen.classList.remove(
            "active"
        );

        locationScreen.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    const app =
        $("app");

    if (!app) {

        console.error(
            "Juice Robo: #app element was not found."
        );

        return;
    }

    app.style.display =
        "flex";

    app.classList.add(
        "active"
    );

    renderMainApp();

    document.body.classList.add(
        "menu-mode"
    );

    console.log(
        "Juice Robo: Menu opened:",
        {
            location:
                state.selectedLocation.name,

            machine:
                state.selectedMachine.machineCode ||
                state.selectedMachine.name ||
                state.selectedMachine.id
        }
    );
}


/* =========================================================
   MAIN APP
   ========================================================= */

function renderMainApp() {

    const app =
        $("app");

    if (!app) {

        console.error(
            "Juice Robo: #app element not found."
        );

        return;
    }

    app.innerHTML = `

        <div class="app-shell">

            ${renderMainHeader()}

            <main class="menu-content">

                <div
                    class="product-container"
                    id="product-container"
                ></div>

            </main>

            ${renderBottomBar()}

        </div>

    `;

    renderProducts();

    updateCartBadge();
}


/* =========================================================
   MAIN HEADER
   ========================================================= */

function renderMainHeader() {

    const logo =
        assetPath(
            "juice-robo-logo.jpg"
        );

    const locationName =
        state.selectedLocation
            ? state.selectedLocation.name
            : "Choose location";

    return `

        <header class="main-header">

            <div class="brand-icon">

                <img
                    src="${escapeAttribute(
                        logo
                    )}"
                    alt="Juice Robo"
                >

            </div>


            <div class="brand-text">

                <strong>
                    JUICE ROBO
                </strong>

                <span>
                    ${escapeHTML(
                        locationName
                    )}
                </span>

            </div>


            <button
                type="button"
                class="history-shortcut"
                data-action="show-history"
                aria-label="Order history"
            >
                ↶
            </button>

        </header>

    `;
}


/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

function renderBottomBar() {

    return `

        <nav class="bottom-nav">

            <button
                type="button"
                class="nav-btn active"
                data-action="back-menu"
                aria-label="Order"
            >

                <span>
                    ☰
                </span>

                <small>
                    Order
                </small>

            </button>


            <button
                type="button"
                class="nav-btn"
                data-action="show-cart"
                aria-label="Cart"
            >

                <span>
                    🛒
                </span>

                <small>
                    Cart
                </small>

                <span
                    class="cart-badge"
                    data-cart-count
                >
                    ${getCartItemCount()}
                </span>

            </button>


            <button
                type="button"
                class="nav-btn"
                data-action="show-history"
                aria-label="Order history"
            >

                <span>
                    ◷
                </span>

                <small>
                    History
                </small>

            </button>


            <button
                type="button"
                class="nav-btn"
                data-action="show-profile"
                aria-label="Profile"
            >

                <span>
                    ●
                </span>

                <small>
                    Profile
                </small>

            </button>

        </nav>

    `;
}
/* =========================================================
   PRODUCT IMAGES
   ========================================================= */

const PRODUCT_IMAGES = {

    plain:
        "/order_now/assets/plain-juice.jpg",

    lemon:
        "/order_now/assets/lemon-juice.jpg",

    ginger:
        "/order_now/assets/ginger-juice.jpg",

    "ginger-lemon":
        "/order_now/assets/ginger-lemon-juice.jpg",

};


/* =========================================================
   PRODUCT IMAGE HELPER
   ========================================================= */

function getProductImage(product) {

    const name =
        String(
            product?.name ||
            product?.productType ||
            ""
        ).toLowerCase();

    if (
        name.includes("ginger") &&
        name.includes("lemon")
    ) {

        return PRODUCT_IMAGES[
            "ginger-lemon"
        ];

    }

    if (
        name.includes("mixed")
    ) {

        return PRODUCT_IMAGES[
            "ginger-lemon"
        ];

    }

    if (
        name.includes("ginger")
    ) {

        return PRODUCT_IMAGES.ginger;

    }

    if (
        name.includes("lemon")
    ) {

        return PRODUCT_IMAGES.lemon;

    }

    return PRODUCT_IMAGES.plain;
}


/* =========================================================
   PRODUCT NAME
   ========================================================= */

function getProductDisplayName(
    product
) {

    const name =
        String(
            product?.name ||
            product?.productType ||
            "Sugarcane Juice"
        );

    const normalized =
        name.toLowerCase();

    if (
        normalized.includes("ginger") &&
        normalized.includes("lemon")
    ) {

        return "Ginger + Lemon";

    }

    if (
        normalized.includes("mixed")
    ) {

        return "Ginger + Lemon";

    }

    if (
        normalized.includes("ginger")
    ) {

        return "Ginger";

    }

    if (
        normalized.includes("lemon")
    ) {

        return "Lemon";

    }

    return "Plain";
}


/* =========================================================
   PRODUCT DESCRIPTION
   ========================================================= */

function getProductDescription(
    product
) {

    const description =
        String(
            product?.description ||
            ""
        ).trim();

    if (description) {

        return description;

    }

    const type =
        getProductDisplayName(
            product
        );

    if (
        type === "Ginger + Lemon"
    ) {

        return (
            "Fresh sugarcane juice " +
            "with ginger and lemon."
        );

    }

    if (
        type === "Ginger"
    ) {

        return (
            "Fresh sugarcane juice " +
            "with ginger."
        );

    }

    if (
        type === "Lemon"
    ) {

        return (
            "Fresh sugarcane juice " +
            "with lemon."
        );

    }

    return (
        "Fresh sugarcane juice."
    );
}


/* =========================================================
   PRODUCT ID
   ========================================================= */

function getProductId(
    product
) {

    /*
     * The legacy adapter uses the VARIANT ID
     * as product.id.
     *
     * Keep it as a string when working with
     * localStorage/cart keys.
     */

    return String(
        product?.id ??
        product?.itemId ??
        ""
    );
}


/* =========================================================
   FIND PRODUCT
   ========================================================= */

function findProduct(
    productId
) {

    const normalizedId =
        String(
            productId
        );

    return PRODUCTS.find(
        product =>
            getProductId(
                product
            ) === normalizedId
    );
}


/* =========================================================
   CART QUANTITY
   ========================================================= */

function getCartQuantity(
    productId
) {

    const id =
        String(
            productId
        );

    return Number(
        state.cart?.[id] || 0
    );
}


/* =========================================================
   CART ITEM COUNT
   ========================================================= */

function getCartItemCount() {

    if (
        !state.cart ||
        typeof state.cart !==
            "object"
    ) {

        return 0;

    }

    return Object.values(
        state.cart
    ).reduce(
        (
            total,
            quantity
        ) => {

            return (
                total +
                Number(
                    quantity || 0
                )
            );

        },
        0
    );
}


/* =========================================================
   CART UNIQUE ITEM COUNT
   ========================================================= */

function getCartUniqueCount() {

    if (
        !state.cart
    ) {

        return 0;

    }

    return Object.values(
        state.cart
    ).filter(
        quantity =>
            Number(
                quantity
            ) > 0
    ).length;
}


/* =========================================================
   CART TOTAL
   ========================================================= */

function getCartTotal() {

    if (
        !state.cart
    ) {

        return 0;

    }

    return Object.entries(
        state.cart
    ).reduce(
        (
            total,
            [
                productId,
                quantity
            ]
        ) => {

            const product =
                findProduct(
                    productId
                );

            if (
                !product
            ) {

                return total;

            }

            const price =
                Number(
                    product.price ||
                    product.unitPrice ||
                    0
                );

            return (
                total +
                (
                    price *
                    Number(
                        quantity || 0
                    )
                )
            );

        },
        0
    );
}


/* =========================================================
   SAVE CART
   ========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            "juice_robo_cart",
            JSON.stringify(
                state.cart || {}
            )
        );

    } catch (error) {

        console.error(
            "Juice Robo: Unable to save cart:",
            error
        );

    }
}


/* =========================================================
   LOAD CART
   ========================================================= */

function loadCart() {

    try {

        const raw =
            localStorage.getItem(
                "juice_robo_cart"
            );

        if (!raw) {

            state.cart = {};

            return;

        }

        const parsed =
            JSON.parse(
                raw
            );

        if (
            parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
        ) {

            state.cart =
                parsed;

        } else {

            state.cart = {};

        }

    } catch (error) {

        console.warn(
            "Juice Robo: Invalid saved cart. Clearing it.",
            error
        );

        state.cart = {};

        localStorage.removeItem(
            "juice_robo_cart"
        );

    }
}


/* =========================================================
   ADD TO CART
   ========================================================= */

function addToCart(
    productId
) {

    const id =
        String(
            productId
        );

    const product =
        findProduct(
            id
        );

    if (!product) {

        console.error(
            "Juice Robo: Product not found:",
            productId
        );

        showToast(
            "Product is no longer available.",
            true
        );

        return;

    }

    if (
        !state.cart ||
        typeof state.cart !==
            "object"
    ) {

        state.cart = {};

    }

    const currentQuantity =
        Number(
            state.cart[id] || 0
        );

    state.cart[id] =
        currentQuantity + 1;

    saveCart();

    updateProductCard(
        id
    );

    updateCartBadge();

    console.log(
        "Juice Robo: Added to cart:",
        {
            product:
                product.name,
            quantity:
                state.cart[id]
        }
    );

    showToast(
        `${getProductDisplayName(product)} added to cart.`
    );
}


/* =========================================================
   REMOVE ONE FROM CART
   ========================================================= */

function removeFromCart(
    productId
) {

    const id =
        String(
            productId
        );

    if (
        !state.cart?.[id]
    ) {

        return;

    }

    const nextQuantity =
        Number(
            state.cart[id]
        ) - 1;

    if (
        nextQuantity <= 0
    ) {

        delete state.cart[id];

    } else {

        state.cart[id] =
            nextQuantity;

    }

    saveCart();

    updateProductCard(
        id
    );

    updateCartBadge();

    if (
        state.screen ===
        "cart"
    ) {

        renderCart();

    }
}


/* =========================================================
   REMOVE ENTIRE PRODUCT
   ========================================================= */

function removeProductFromCart(
    productId
) {

    const id =
        String(
            productId
        );

    if (
        state.cart &&
        Object.prototype.hasOwnProperty.call(
            state.cart,
            id
        )
    ) {

        delete state.cart[id];

    }

    saveCart();

    updateProductCard(
        id
    );

    updateCartBadge();

    if (
        state.screen ===
        "cart"
    ) {

        renderCart();

    }
}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {

    state.cart = {};

    saveCart();

    updateCartBadge();

    renderProducts();

    if (
        state.screen ===
        "cart"
    ) {

        renderCart();

    }
}


/* =========================================================
   UPDATE CART BADGE
   ========================================================= */

function updateCartBadge() {

    const count =
        getCartItemCount();

    document
        .querySelectorAll(
            "[data-cart-count]"
        )
        .forEach(
            element => {

                element.textContent =
                    String(
                        count
                    );

                element.classList.toggle(
                    "has-items",
                    count > 0
                );

            }
        );


    /*
     * Hide badge when cart is empty.
     */

    document
        .querySelectorAll(
            ".cart-badge"
        )
        .forEach(
            element => {

                element.style.display =
                    count > 0
                        ? "flex"
                        : "none";

            }
        );
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {

    const container =
        document.getElementById(
            "product-container"
        );

    if (!container) {

        console.warn(
            "Juice Robo: Product container not found."
        );

        return;

    }


    if (
        state.loadingProducts
    ) {

        container.innerHTML = `

            <div class="product-loading">

                <div class="loading-spinner"></div>

                <p>
                    Loading fresh juices...
                </p>

            </div>

        `;

        return;

    }


    if (
        !Array.isArray(
            PRODUCTS
        ) ||
        PRODUCTS.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    🧃
                </div>

                <h2>
                    No juices available
                </h2>

                <p>
                    Please try again later.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML = `

        <section class="products-section">

            <div class="section-heading">

                <div>

                    <span class="section-eyebrow">
                        OUR MENU
                    </span>

                    <h2>
                        Fresh picks
                    </h2>

                </div>


                <span class="product-count">
                    ${
                        PRODUCTS.length
                    } juices
                </span>

            </div>


            <div class="products-grid">

                ${
                    PRODUCTS
                        .map(
                            product =>
                                renderProductCard(
                                    product
                                )
                        )
                        .join("")
                }

            </div>

        </section>

    `;


    updateCartBadge();
}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function renderProductCard(
    product
) {

    const id =
        getProductId(
            product
        );

    const quantity =
        getCartQuantity(
            id
        );

    const image =
        getProductImage(
            product
        );

    const displayName =
        getProductDisplayName(
            product
        );

    const description =
        getProductDescription(
            product
        );

    const price =
        Number(
            product?.price ||
            product?.unitPrice ||
            0
        );


    return `

        <article
            class="product-card"
            data-product-id="${escapeAttribute(
                id
            )}"
        >

            <div class="product-image-wrap">

                <span class="product-fresh-badge">
                    <span class="fresh-dot"></span>
                    Fresh
                </span>


                <img
                    class="product-image"
                    src="${escapeAttribute(
                        image
                    )}"
                    alt="${escapeAttribute(
                        displayName
                    )} sugarcane juice"
                    loading="lazy"
                    onerror="handleProductImageError(this)"
                >

            </div>


            <div class="product-card-content">

                <p class="product-description">
                    ${escapeHTML(
                        description
                    )}
                </p>


                <h3 class="product-name">
                    ${escapeHTML(
                        displayName
                    )}
                </h3>


                <div class="product-card-bottom">

                    <strong class="product-price">
                        ₹${price}
                    </strong>


                    ${
                        quantity > 0

                            ? `

                                <div
                                    class="quantity-control"
                                    data-quantity-control="${escapeAttribute(
                                        id
                                    )}"
                                >

                                    <button
                                        type="button"
                                        class="quantity-btn"
                                        data-action="decrease-product"
                                        data-product-id="${escapeAttribute(
                                            id
                                        )}"
                                        aria-label="Decrease quantity"
                                    >
                                        −
                                    </button>


                                    <span class="quantity-value">
                                        ${quantity}
                                    </span>


                                    <button
                                        type="button"
                                        class="quantity-btn"
                                        data-action="increase-product"
                                        data-product-id="${escapeAttribute(
                                            id
                                        )}"
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>

                                </div>

                              `

                            : `

                                <button
                                    type="button"
                                    class="add-product-btn"
                                    data-action="add-product"
                                    data-product-id="${escapeAttribute(
                                        id
                                    )}"
                                    aria-label="Add ${escapeAttribute(
                                        displayName
                                    )} to cart"
                                >
                                    +
                                </button>

                              `
                    }

                </div>

            </div>

        </article>

    `;
}


/* =========================================================
   UPDATE SINGLE PRODUCT CARD
   ========================================================= */

function updateProductCard(
    productId
) {

    const id =
        String(
            productId
        );

    const card =
        document.querySelector(
            `.product-card[data-product-id="${cssEscape(
                id
            )}"]`
        );

    if (!card) {

        return;

    }

    const product =
        findProduct(
            id
        );

    if (!product) {

        return;

    }

    const replacement =
        document.createElement(
            "div"
        );

    replacement.innerHTML =
        renderProductCard(
            product
        );

    const newCard =
        replacement.firstElementChild;

    if (
        newCard
    ) {

        card.replaceWith(
            newCard
        );

    }
}


/* =========================================================
   PRODUCT IMAGE ERROR FALLBACK
   ========================================================= */

function handleProductImageError(
    image
) {

    if (
        !image ||
        image.dataset.fallbackApplied ===
            "true"
    ) {

        return;

    }

    image.dataset.fallbackApplied =
        "true";

    image.src =
        PRODUCT_IMAGES.plain;

}


/* =========================================================
   CART SCREEN
   ========================================================= */

function showCartScreen() {

    state.screen =
        "cart";

    hideDynamicScreens();

    const app =
        document.getElementById(
            "app"
        );

    if (!app) {

        return;

    }

    app.style.display =
        "flex";

    app.classList.add(
        "active"
    );

    renderCart();

    document.body.classList.add(
        "cart-mode"
    );
}


/* =========================================================
   RENDER CART
   ========================================================= */

function renderCart() {

    const app =
        document.getElementById(
            "app"
        );

    if (!app) {

        return;

    }


    const cartEntries =
        Object.entries(
            state.cart || {}
        )
        .filter(
            (
                [
                    productId,
                    quantity
                ]
            ) => {

                return (
                    findProduct(
                        productId
                    ) &&
                    Number(
                        quantity
                    ) > 0
                );

            }
        );


    if (
        cartEntries.length === 0
    ) {

        app.innerHTML = `

            <div class="app-shell cart-page-shell">

                <header class="page-header">

                    <button
                        type="button"
                        class="header-back-btn"
                        data-action="back-menu"
                        aria-label="Back to menu"
                    >
                        ←
                    </button>

                    <h1>
                        Your Cart
                    </h1>

                    <div class="header-spacer"></div>

                </header>


                <main class="cart-content">

                    <div class="empty-cart">

                        <div class="empty-cart-icon">
                            🛒
                        </div>

                        <h2>
                            Your cart is empty
                        </h2>

                        <p>
                            Add a fresh juice to get started.
                        </p>


                        <button
                            type="button"
                            class="primary full-width"
                            data-action="back-menu"
                        >
                            BROWSE JUICES
                        </button>

                    </div>

                </main>


                ${renderBottomBar()}

            </div>

        `;

        updateCartBadge();

        return;
    }


    const total =
        getCartTotal();


    const itemCount =
        getCartItemCount();


    app.innerHTML = `

        <div class="app-shell cart-page-shell">

            <header class="page-header">

                <button
                    type="button"
                    class="header-back-btn"
                    data-action="back-menu"
                    aria-label="Back to menu"
                >
                    ←
                </button>

                <h1>
                    Your Cart
                </h1>

                <button
                    type="button"
                    class="clear-cart-btn"
                    data-action="clear-cart"
                >
                    Clear
                </button>

            </header>


            <main class="cart-content">

                <div class="cart-items">

                    ${
                        cartEntries
                            .map(
                                (
                                    [
                                        productId,
                                        quantity
                                    ]
                                ) => {

                                    const product =
                                        findProduct(
                                            productId
                                        );

                                    return renderCartItem(
                                        product,
                                        Number(
                                            quantity
                                        )
                                    );

                                }
                            )
                            .join("")
                    }

                </div>


                <div class="cart-summary">

                    <div class="summary-row">

                        <span>
                            Items
                        </span>

                        <strong>
                            ${itemCount}
                        </strong>

                    </div>


                    <div class="summary-row total-row">

                        <span>
                            Total
                        </span>

                        <strong>
                            ₹${total}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="primary full-width checkout-btn"
                        data-action="checkout"
                    >
                        PROCEED TO CHECKOUT
                    </button>

                </div>

            </main>


            ${renderBottomBar()}

        </div>

    `;


    updateCartBadge();
}


/* =========================================================
   CART ITEM
   ========================================================= */

function renderCartItem(
    product,
    quantity
) {

    if (!product) {

        return "";

    }


    const id =
        getProductId(
            product
        );

    const image =
        getProductImage(
            product
        );

    const name =
        getProductDisplayName(
            product
        );

    const price =
        Number(
            product?.price ||
            product?.unitPrice ||
            0
        );

    const subtotal =
        price *
        quantity;


    return `

        <article
            class="cart-item"
            data-product-id="${escapeAttribute(
                id
            )}"
        >

            <img
                class="cart-item-image"
                src="${escapeAttribute(
                    image
                )}"
                alt="${escapeAttribute(
                    name
                )}"
                onerror="handleProductImageError(this)"
            >


            <div class="cart-item-details">

                <h3>
                    ${escapeHTML(
                        name
                    )}
                </h3>

                <span>
                    ₹${price} each
                </span>


                <strong>
                    ₹${subtotal}
                </strong>

            </div>


            <div class="cart-item-actions">

                <button
                    type="button"
                    class="quantity-btn"
                    data-action="decrease-product"
                    data-product-id="${escapeAttribute(
                        id
                    )}"
                    aria-label="Decrease quantity"
                >
                    −
                </button>


                <span class="quantity-value">
                    ${quantity}
                </span>


                <button
                    type="button"
                    class="quantity-btn"
                    data-action="increase-product"
                    data-product-id="${escapeAttribute(
                        id
                    )}"
                    aria-label="Increase quantity"
                >
                    +
                </button>


                <button
                    type="button"
                    class="remove-cart-item"
                    data-action="remove-product"
                    data-product-id="${escapeAttribute(
                        id
                    )}"
                    aria-label="Remove ${escapeAttribute(
                        name
                    )}"
                >
                    ×
                </button>

            </div>

        </article>

    `;
}


/* =========================================================
   INCREASE PRODUCT
   ========================================================= */

function increaseProductQuantity(
    productId
) {

    const id =
        String(
            productId
        );

    const product =
        findProduct(
            id
        );

    if (!product) {

        return;

    }

    if (
        !state.cart
    ) {

        state.cart = {};

    }

    state.cart[id] =
        Number(
            state.cart[id] || 0
        ) + 1;

    saveCart();

    updateCartBadge();


    if (
        state.screen ===
        "cart"
    ) {

        renderCart();

    } else {

        updateProductCard(
            id
        );

    }
}


/* =========================================================
   DECREASE PRODUCT
   ========================================================= */

function decreaseProductQuantity(
    productId
) {

    removeFromCart(
        productId
    );
}


/* =========================================================
   CART VALIDATION
   ========================================================= */

function cleanCart() {

    if (
        !state.cart ||
        typeof state.cart !==
            "object"
    ) {

        state.cart = {};

        saveCart();

        return;

    }


    const validProductIds =
        new Set(
            PRODUCTS.map(
                product =>
                    String(
                        product.id
                    )
            )
        );


    Object.keys(
        state.cart
    ).forEach(
        productId => {

            const normalizedProductId =
                String(
                    productId
                );


            if (
                !validProductIds.has(
                    normalizedProductId
                )
            ) {

                delete state.cart[
                    productId
                ];

                return;

            }


            const quantity =
                Number(
                    state.cart[
                        productId
                    ]
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                delete state.cart[
                    productId
                ];

            } else {

                state.cart[
                    productId
                ] =
                    Math.floor(
                        quantity
                    );

            }

        }
    );


    saveCart();
}


/* =========================================================
   INITIALIZE CART
   ========================================================= */

loadCart();