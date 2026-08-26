"use strict";

/*
============================================================
JUICE ROBO — CUSTOMER WEBSITE
============================================================

FRONTEND:
http://127.0.0.1:5500/GSKindex.html

BACKEND:
http://127.0.0.1:8000

REQUIRED:
api.js must be loaded BEFORE app.js.

CURRENT BACKEND FLOW:

GET  /locations
GET  /machines
GET  /products

POST /users
POST /orders

GET  /orders
GET  /orders/{order_id}

The old /book API is NOT used.

============================================================
*/


/* =========================================================
   APPLICATION DATA
   ========================================================= */

let PRODUCTS = [];
let LOCATIONS = [];
let MACHINES = [];


/* =========================================================
   PRODUCT DISPLAY CONFIG
   ========================================================= */

const PRODUCT_IMAGES = {

    plain:
        "./assets/plain-juice.jpg",

    lemon:
        "./assets/lemon-juice.jpg",

    ginger:
        "./assets/ginger-juice.jpg",

    "ginger-lemon":
        "./assets/ginger-lemon-juice.jpg"

};


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEYS = {

    location:
        "juiceRoboSelectedLocation",

    cart:
        "juiceRoboCart",

    history:
        "juiceRoboHistory",

    user:
        "juiceRoboUser"

};


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {

    screen:
        "location",

    selectedLocation:
        null,

    selectedMachine:
        null,

    cart:
        {},

    history:
        [],

    user: {

        id:
            "",

        name:
            "",

        phone:
            "",

        email:
            ""

    },

    loadingProducts:
        false,

    loadingLocations:
        false,

    loadingMachines:
        false,

    placingOrder:
        false

};


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   PRODUCT TYPE
   ========================================================= */

function productKey(productType) {

    return String(
        productType || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s*\+\s*/g,
            "-"
        )
        .replace(
            /\s+/g,
            "-"
        );

}


/* =========================================================
   PRODUCT DESCRIPTION
   ========================================================= */

function productDescription(productType) {

    const type =
        String(
            productType || ""
        )
            .trim()
            .toLowerCase();


    switch (type) {

        case "plain":

            return "Fresh & Natural";


        case "lemon":

            return "Tangy & Refreshing";


        case "ginger":

            return "Fresh & Zesty";


        case "ginger + lemon":

            return "Zesty & Refreshing";


        default:

            return "Fresh sugarcane juice";

    }

}


/* =========================================================
   FORMAT MONEY
   ========================================================= */

function formatMoney(value) {

    const number =
        Number(value || 0);

    return number.toFixed(0);

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ATTRIBUTE ESCAPE
   ========================================================= */

function escapeAttribute(value) {

    return escapeHTML(value);

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeApp() {

    console.log(
        "Juice Robo application initializing..."
    );


    /*
     * =====================================================
     * LOAD LOCAL DATA
     * =====================================================
     */

    loadCart();

    loadSelectedLocation();

    loadHistory();

    loadUser();


    /*
     * =====================================================
     * SETUP EVENTS
     * =====================================================
     */

    setupEventDelegation();

    setupKeyboardSupport();


    /*
     * =====================================================
     * CREATE DYNAMIC SCREENS
     * =====================================================
     */

    ensureDynamicScreens();


    /*
     * =====================================================
     * INITIAL CART BADGE
     * =====================================================
     */

    updateCartBadge();


    /*
     * =====================================================
     * LOAD BACKEND DATA
     * =====================================================
     */

    const loaded =
        await loadBackendData();


    if (!loaded) {

        console.error(
            "Juice Robo: Backend data could not be loaded."
        );


        showBackendError();

        return;

    }


    /*
     * =====================================================
     * RESTORE SAVED LOCATION
     * =====================================================
     */

    const restored =
        restoreSelectedLocation();


    /*
     * =====================================================
     * UPDATE CART
     * =====================================================
     */

    updateCartBadge();


    /*
     * =====================================================
     * INITIAL SCREEN
     * =====================================================
     */

    if (
        restored &&
        state.selectedLocation &&
        state.selectedMachine
    ) {

        console.log(
            "Juice Robo: Opening menu with saved location."
        );


        showMenuScreen();

    } else {

        console.log(
            "Juice Robo: No valid saved location."
        );


        showLocationScreen();

    }


    console.log(
        "Juice Robo application initialized."
    );

}


/* =========================================================
   LOAD BACKEND DATA
   ========================================================= */

async function loadBackendData() {

    if (
        typeof window.JuiceRoboAPI ===
        "undefined"
    ) {

        console.error(
            "JuiceRoboAPI is not available."
        );

        return false;

    }


    state.loadingProducts =
        true;

    state.loadingLocations =
        true;

    state.loadingMachines =
        true;


    try {

        const [

            products,

            locations,

            machines

        ] = await Promise.all([

            JuiceRoboAPI.getProducts(),

            JuiceRoboAPI.getLocations(),

            JuiceRoboAPI.getMachines()

        ]);


        /*
        ------------------------------------------------------
        PRODUCTS
        ------------------------------------------------------
        */

        const PRODUCT_IMAGES = {
    plain: "/assets/plain-juice.jpg",
    lemon: "/assets/lemon-juice.jpg",
    ginger: "/assets/ginger-juice.jpg",
    "ginger-lemon": "/assets/ginger_lemon_juice_.jpg"
};

function productKey(productType) {
    return String(productType || "")
        .trim()
        .toLowerCase()
        .replace(/\s*\+\s*/g, "-")
        .replace(/\s+/g, "-");
}

PRODUCTS = products.map(product => {

    const productType =
        String(product.product_type || "");

    const key =
        productKey(productType);

    const image =
        PRODUCT_IMAGES[key] ||
        PRODUCT_IMAGES.plain;

    return {
        id: String(product.id),

        name: String(product.name || ""),

        productType: productType,

        description:
            productType === "Plain"
                ? "Fresh & Natural"
                : productType === "Lemon"
                    ? "Tangy & Refreshing"
                    : productType === "Ginger"
                        ? "Fresh & Zesty"
                        : productType === "Ginger + Lemon"
                            ? "Zesty & Refreshing"
                            : "Fresh sugarcane juice",

        price: Number(product.price || 0),

        image: image,

        image_url: image,

        isAvailable:
            product.is_available !== false
    };
});
        /*
        ------------------------------------------------------
        LOCATIONS
        ------------------------------------------------------
        */

        LOCATIONS =
            locations.map(
                location => ({

                    id:
                        String(
                            location.id
                        ),

                    name:
                        String(
                            location.name ||
                            ""
                        ),

                    address:
                        String(
                            location.address ||
                            ""
                        ),

                    isActive:
                        location.isActive !==
                        false,

                    icon:
                        "●"

                })
            );


        /*
        ------------------------------------------------------
        MACHINES
        ------------------------------------------------------
        */

        MACHINES =
            machines.map(
                machine => ({

                    id:
                        String(
                            machine.id
                        ),

                    machineCode:
                        String(
                            machine.machineCode ||
                            ""
                        ),

                    name:
                        String(
                            machine.name ||
                            ""
                        ),

                    locationId:
                        String(
                            machine.locationId ||
                            ""
                        ),

                    firmwareVersion:
                        String(
                            machine.firmwareVersion ||
                            ""
                        ),

                    status:
                        String(
                            machine.status ||
                            "OFFLINE"
                        ),

                    lastSeenAt:
                        machine.lastSeenAt ||
                        null

                })
            );


        console.log(
            "Products loaded:",
            PRODUCTS
        );

        console.log(
            "Locations loaded:",
            LOCATIONS
        );

        console.log(
            "Machines loaded:",
            MACHINES
        );


        /*
        ------------------------------------------------------
        REMOVE INVALID CART ITEMS
        ------------------------------------------------------
        */

        const validProductIds =
            new Set(
                PRODUCTS.map(
                    product =>
                        product.id
                )
            );


        Object.keys(
            state.cart
        ).forEach(
            productId => {

                if (
                    !validProductIds.has(
                        productId
                    )
                ) {

                    delete state.cart[
                        productId
                    ];

                }

            }
        );


        saveCart();


        return (
            PRODUCTS.length > 0 &&
            LOCATIONS.length > 0
        );

    } catch (error) {

        console.error(
            "Unable to load Juice Robo backend data:",
            error
        );

        return false;

    } finally {

        state.loadingProducts =
            false;

        state.loadingLocations =
            false;

        state.loadingMachines =
            false;

    }

}


/* =========================================================
   LOCATION / MACHINE
   ========================================================= */

function getMachineForLocation(
    locationId
) {

    /*
     * Normalize the location ID.
     *
     * HTML dataset values are strings,
     * while API IDs are numbers.
     */
    const numericLocationId =
        Number(locationId);


    console.log(
        "Juice Robo: Looking for machine for location:",
        numericLocationId
    );


    /*
     * First preference:
     *
     * Find an ONLINE machine assigned
     * to the selected location.
     *
     * IMPORTANT:
     * The frontend MACHINES array uses
     * locationId (camelCase).
     */
    const onlineMachine =
        MACHINES.find(
            machine =>
                Number(
                    machine.locationId
                ) ===
                numericLocationId &&
                String(
                    machine.status
                ).toUpperCase() ===
                "ONLINE"
        );


    if (onlineMachine) {

        console.log(
            "Juice Robo: Online machine found:",
            onlineMachine
        );


        return onlineMachine;

    }


    /*
     * Fallback:
     *
     * Find any machine assigned
     * to the selected location.
     */
    const assignedMachine =
        MACHINES.find(
            machine =>
                Number(
                    machine.locationId
                ) ===
                numericLocationId
        );


    if (assignedMachine) {

        console.log(
            "Juice Robo: Assigned machine found:",
            assignedMachine
        );


        return assignedMachine;

    }


    /*
     * No machine was found.
     */
    console.warn(
        "Juice Robo: No machine assigned to location:",
        numericLocationId
    );


    return null;

}
/* =========================================================
   RESTORE SELECTED LOCATION
   ========================================================= */

function restoreSelectedLocation() {

    console.log(
        "Juice Robo: Restoring saved location..."
    );


    /*
     * =====================================================
     * NO SAVED LOCATION
     * =====================================================
     */

    if (
        !state.selectedLocation
    ) {

        state.selectedLocation =
            null;

        state.selectedMachine =
            null;


        console.log(
            "Juice Robo: No saved location."
        );


        return false;

    }


    /*
     * =====================================================
     * NORMALIZE SAVED LOCATION ID
     * =====================================================
     */

    const savedLocationId =
        String(
            state.selectedLocation.id
        );


    console.log(
        "Juice Robo: Saved location ID:",
        savedLocationId
    );


    /*
     * =====================================================
     * FIND LOCATION IN CURRENT BACKEND DATA
     * =====================================================
     */

    const location =
        LOCATIONS.find(
            item =>
                String(
                    item.id
                ) ===
                savedLocationId
        );


    /*
     * =====================================================
     * SAVED LOCATION NO LONGER EXISTS
     * =====================================================
     */

    if (!location) {

        console.warn(
            "Juice Robo: Saved location no longer exists:",
            savedLocationId
        );


        state.selectedLocation =
            null;

        state.selectedMachine =
            null;


        saveSelectedLocation();


        return false;

    }


    /*
     * =====================================================
     * FIND CURRENT MACHINE
     *
     * Always use the current backend machine data
     * instead of trusting an old machine stored in
     * localStorage.
     * =====================================================
     */

    const machine =
        getMachineForLocation(
            location.id
        );


    /*
     * =====================================================
     * LOCATION EXISTS BUT MACHINE DOES NOT
     * =====================================================
     */

    if (!machine) {

        console.warn(
            "Juice Robo: Saved location has no available machine:",
            location.name
        );


        state.selectedLocation =
            null;

        state.selectedMachine =
            null;


        saveSelectedLocation();


        return false;

    }


    /*
     * =====================================================
     * RESTORE CURRENT BACKEND DATA
     * =====================================================
     */

    state.selectedLocation = {

        ...location

    };


    state.selectedMachine = {

        ...machine

    };


    /*
     * =====================================================
     * SAVE NORMALIZED DATA
     * =====================================================
     */

    saveSelectedLocation();


    /*
     * =====================================================
     * DEBUG
     * =====================================================
     */

    console.log(
        "Juice Robo: Saved location restored successfully:",
        {
            locationId:
                state.selectedLocation.id,

            locationName:
                state.selectedLocation.name,

            machineCode:
                state.selectedMachine.machineCode,

            machineStatus:
                state.selectedMachine.status
        }
    );


    return true;

}

/* =========================================================
   LOCATION SCREEN ELEMENT
   ========================================================= */

function ensureLocationScreen() {

    let screen =
        document.getElementById(
            "location-screen"
        );


    /*
     * Create the screen if it does not
     * already exist in the HTML.
     */

    if (!screen) {

        screen =
            document.createElement(
                "section"
            );


        screen.id =
            "location-screen";


        document.body.appendChild(
            screen
        );

    }


    /*
     * Make sure the location screen is
     * attached directly to <body>.
     */

    else if (
        screen.parentElement !==
        document.body
    ) {

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

    console.log(
        "Juice Robo: Opening location screen."
    );


    state.screen =
        "location";


    hideDynamicScreens();


    /*
     * Get or create the location screen.
     */

    const screen =
        ensureLocationScreen();


    if (!screen) {

        console.error(
            "Juice Robo: Location screen could not be created."
        );

        return;

    }


    /*
     * Show location screen.
     */

    screen.style.display =
        "flex";


    screen.classList.add(
        "active"
    );


    /*
     * Hide the normal app.
     */

    const app =
        document.getElementById(
            "app"
        );


    if (app) {

        app.style.display =
            "none";


        app.classList.remove(
            "active"
        );

    }


    /*
     * Render locations.
     */

    renderLocationScreen();


    /*
     * Update body mode.
     */

    document.body.classList.add(
        "location-mode"
    );


    document.body.classList.remove(
        "menu-mode",
        "cart-mode",
        "checkout-mode",
        "confirmation-mode",
        "history-mode",
        "profile-mode"
    );


    console.log(
        "Juice Robo: Location screen opened successfully."
    );

}
   


/* =========================================================
   RENDER LOCATION SCREEN
   ========================================================= */

function renderLocationScreen() {

    /*
     * IMPORTANT:
     *
     * The location screen is a separate overlay
     * outside #app.
     *
     * Do NOT render this inside #app because
     * showLocationScreen() intentionally hides #app.
     */

    const screen =
        ensureLocationScreen();


    if (!screen) {

        console.error(
            "Juice Robo: Location screen element not found."
        );

        return;

    }


    /*
     * Render the complete location page.
     */

    screen.innerHTML = `

        <div
            class="location-page"
        >

            <!-- =========================================
                 HEADER
                 ========================================= -->

            <header
                class="location-header"
            >

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


                <div
                    class="header-spacer"
                ></div>

            </header>


            <!-- =========================================
                 CONTENT
                 ========================================= -->

            <main
                class="location-content"
            >

                <div
                    class="location-intro"
                >

                    <div
                        class="location-intro-icon"
                        aria-hidden="true"
                    >
                        📍
                    </div>


                    <h2>
                        Select your Juice Robo machine
                    </h2>


                    <p>
                        Choose the machine where you want
                        to collect your order.
                    </p>

                </div>


                <!-- =====================================
                     LOCATION LIST
                     ===================================== -->

                <div
                    class="location-list"
                >

                    ${
                        LOCATIONS
                            .filter(
                                location =>
                                    location.isActive !== false
                            )
                            .map(
                                renderLocationCard
                            )
                            .join("")
                    }

                </div>

            </main>

        </div>

    `;


    /*
     * Debug information.
     */

    console.log(
        "Juice Robo: Location screen rendered.",
        LOCATIONS.length,
        "locations."
    );

}


/* =========================================================
   LOCATION CARD
   ========================================================= */

/* =========================================================
   RENDER LOCATION CARD
   ========================================================= */

function renderLocationCard(
    location
) {

    /*
     * =====================================================
     * FIND MACHINE ASSIGNED TO LOCATION
     * =====================================================
     */

    const machine =
        getMachineForLocation(
            location.id
        );


    /*
     * =====================================================
     * CHECK SELECTED LOCATION
     *
     * IMPORTANT:
     *
     * API IDs are normalized to strings.
     *
     * localStorage may contain an older numeric ID.
     *
     * Therefore ALWAYS compare IDs as strings.
     * =====================================================
     */

    const selected =
        Boolean(
            state.selectedLocation &&
            String(
                state.selectedLocation.id
            ) ===
            String(
                location.id
            )
        );


    /*
     * =====================================================
     * MACHINE STATUS
     * =====================================================
     */

    const machineStatus =
        machine
            ? String(
                machine.status ||
                "UNKNOWN"
            ).toUpperCase()
            : "NO MACHINE";


    /*
     * =====================================================
     * DEBUG
     * =====================================================
     */

    console.log(
        "Juice Robo: Rendering location card:",
        {
            locationId:
                String(
                    location.id
                ),

            locationName:
                location.name,

            selectedLocationId:
                state.selectedLocation
                    ? String(
                        state.selectedLocation.id
                    )
                    : null,

            selected,

            machine:
                machine
                    ? machine.machineCode
                    : null,

            machineStatus
        }
    );


    /*
     * =====================================================
     * LOCATION CARD
     * =====================================================
     */

    return `

        <article
            class="
                location-card
                ${
                    selected
                        ? "is-selected"
                        : ""
                }
            "
        >

            <!-- =========================================
                 LOCATION ICON
                 ========================================= -->

            <div
                class="location-card-icon"
            >

                ${escapeHTML(
                    location.icon ||
                    "●"
                )}

            </div>


            <!-- =========================================
                 LOCATION DETAILS
                 ========================================= -->

            <div
                class="location-card-details"
            >

                <h2>
                    ${escapeHTML(
                        location.name
                    )}
                </h2>


                <p>
                    ${escapeHTML(
                        location.address ||
                        ""
                    )}
                </p>


                <span
                    class="location-description"
                >

                    ${
                        machine
                            ? `
                                Machine:
                                ${escapeHTML(
                                    machine.machineCode ||
                                    machine.machine_code ||
                                    "Unknown"
                                )}
                              `
                            : `
                                No machine assigned
                              `
                    }

                </span>


                <span
                    class="location-description"
                >

                    Status:
                    ${escapeHTML(
                        machineStatus
                    )}

                </span>

            </div>


            <!-- =========================================
                 SELECT BUTTON
                 ========================================= -->

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

function selectLocation(locationId) {

    console.log(
        "Juice Robo: Selecting location:",
        locationId
    );

    /*
     * Normalize the ID because the API may return
     * either a number or a string.
     */
    const normalizedLocationId =
        String(locationId);

    /*
     * Find selected location.
     */
    const location =
        LOCATIONS.find(
            item =>
                String(item.id) ===
                normalizedLocationId
        );

    if (!location) {

        console.error(
            "Juice Robo: Location not found:",
            normalizedLocationId
        );

        showToast(
            "Location not found.",
            true
        );

        return;
    }

    console.log(
        "Juice Robo: Location found:",
        location
    );

    /*
     * Find the Juice Robo machine
     * assigned to this location.
     */
    const machine =
        getMachineForLocation(
            location.id
        );

    if (!machine) {

        console.error(
            "Juice Robo: No machine found for location:",
            location.id
        );

        showToast(
            "No Juice Robo machine is available at this location.",
            true
        );

        return;
    }

    console.log(
        "Juice Robo: Machine found:",
        machine
    );

    /*
     * Save selected location.
     */
    state.selectedLocation = {
        ...location
    };

    /*
     * Save selected machine.
     */
    state.selectedMachine = {
        ...machine
    };

    console.log(
        "Juice Robo: Selected location:",
        state.selectedLocation
    );

    console.log(
        "Juice Robo: Selected machine:",
        state.selectedMachine
    );

    /*
     * Persist selection.
     */
    saveSelectedLocation();

    /*
     * IMPORTANT:
     * Immediately open the menu.
     */
    showMenuScreen();
}
/* =========================================================
   MAIN MENU
   ========================================================= */

function showMenuScreen() {

    console.log(
        "Juice Robo: Opening menu screen."
    );

    /*
     * =====================================================
     * LOCATION REQUIRED
     * =====================================================
     */

    if (!state.selectedLocation) {

        console.warn(
            "Juice Robo: No selected location."
        );

        showLocationScreen();

        return;
    }

    /*
     * =====================================================
     * MACHINE REQUIRED
     * =====================================================
     */

    if (!state.selectedMachine) {

        console.log(
            "Juice Robo: Finding machine for location:",
            state.selectedLocation.id
        );

        state.selectedMachine =
            getMachineForLocation(
                state.selectedLocation.id
            );
    }

    if (!state.selectedMachine) {

        console.error(
            "Juice Robo: No machine available."
        );

        showToast(
            "No machine is available for this location.",
            true
        );

        showLocationScreen();

        return;
    }

    /*
     * =====================================================
     * SET SCREEN
     * =====================================================
     */

    state.screen = "menu";


    /*
     * =====================================================
     * HIDE ALL DYNAMIC SCREENS
     * =====================================================
     */

    hideDynamicScreens();


    /*
     * =====================================================
     * EXPLICITLY HIDE LOCATION SCREEN
     *
     * This is important because the location screen
     * is a fixed overlay outside #app.
     * =====================================================
     */

    const locationScreen =
        document.getElementById(
            "location-screen"
        );

    if (locationScreen) {

        locationScreen.classList.remove(
            "active"
        );

        locationScreen.style.display =
            "none";

        locationScreen.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    /*
     * =====================================================
     * SHOW MAIN APP
     * =====================================================
     */

    const app =
        document.getElementById(
            "app"
        );

    if (!app) {

        console.error(
            "Juice Robo: #app element not found."
        );

        return;
    }

    app.style.display =
        "flex";

    app.classList.add(
        "active"
    );


    /*
     * =====================================================
     * RENDER MENU
     * =====================================================
     */

    renderMainApp();


    /*
     * =====================================================
     * BODY MODE
     * =====================================================
     */

    document.body.classList.remove(
        "location-mode",
        "cart-mode",
        "checkout-mode",
        "confirmation-mode",
        "history-mode",
        "profile-mode"
    );

    document.body.classList.add(
        "menu-mode"
    );


    /*
     * =====================================================
     * DEBUG
     * =====================================================
     */

    console.log(
        "Juice Robo: Menu screen opened successfully.",
        {
            location:
                state.selectedLocation.name,

            locationId:
                state.selectedLocation.id,

            machine:
                state.selectedMachine.machineCode,

            machineStatus:
                state.selectedMachine.status
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

        return;

    }


    app.innerHTML = `

        <div class="app-shell">

            ${renderMainHeader()}


            <main
                class="menu-content"
            >

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

    return `

        <header class="main-header">

            <div class="brand-icon">
                <img
                    src="/assets/juice-robo-logo.jpg"
                    alt="Juice Robo"
                >
            </div>

            <div class="brand-text">

                <strong>
                    JUICE ROBO
                </strong>

                <span>
                    Order ahead, collect at the machine
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
   BOTTOM BAR
   ========================================================= */

function renderBottomBar() {

    return `

        <nav class="bottom-nav">

            <button
                type="button"
                class="nav-btn active"
                data-action="back-menu"
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
                data-action="show-history"
            >

                <span>
                    ◷
                </span>

                <small>
                    History
                </small>

            </button>

        </nav>

    `;

}

/* =========================================================
   PRODUCTS
   ========================================================= */

function renderProducts() {

    const container =
        $("product-container");


    if (!container) {

        console.error(
            "Juice Robo: Product container not found."
        );

        return;

    }


    console.log(
        "Juice Robo: PRODUCTS available for rendering:",
        PRODUCTS
    );


    if (
        PRODUCTS.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

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

        <div class="menu-title-row">

            <h2>
                Sugarcane Juice Menu
            </h2>

            <span
                id="menu-cart-count"
            >
                ${getCartItemCount()}
                ${
                    getCartItemCount() === 1
                        ? " item"
                        : " items"
                }
            </span>

        </div>


        <div class="product-list">

            ${PRODUCTS
                .map(
                    renderProductCard
                )
                .join("")
            }

        </div>

    `;

}


    console.log(
        "Juice Robo: Product cards rendered:",
        PRODUCTS.length
    );
/* =========================================================
   PRODUCT CARD
   ========================================================= */

function renderProductCard(
    product
) {

    const quantity =
        getCartQuantity(
            product.id
        );


    const imageUrl =
        String(
            product.image_url ||
            product.image ||
            ""
        );


    console.log(
        "Juice Robo: Rendering product image:",
        product.name,
        imageUrl
    );


    return `

        <article
            class="product-card"
        >

            <div
                class="product-image-wrapper"
            >

                <img
                    class="product-image"
                    src="${escapeAttribute(
                        imageUrl
                    )}"
                    alt="${escapeAttribute(
                        product.name
                    )}"
                    loading="lazy"
                    onerror="
                        console.error(
                            'Juice Robo: Product image failed:',
                            this.src
                        );
                    "
                >

            </div>


            <div
                class="product-heading"
            >

                <h3>
                    ${escapeHTML(
                        product.name
                    )}
                </h3>


                <p>
                    ${escapeHTML(
                        product.description || ""
                    )}
                </p>

            </div>


            <div
                class="product-divider"
            ></div>


            <div
                class="product-bottom"
            >

                <div
                    class="product-info"
                >

                    <strong
                        class="product-price"
                    >
                        ₹${formatMoney(
                            product.price
                        )}
                    </strong>

                </div>


                <div
                    class="quantity-controls"
                >

                    <button
                        type="button"
                        class="quantity-btn minus-btn"
                        data-action="decrease"
                        data-product-id="${escapeAttribute(
                            product.id
                        )}"
                        ${quantity === 0
                            ? "disabled"
                            : ""}
                    >
                        −
                    </button>


                    <span
                        class="quantity-value"
                        data-quantity="${escapeAttribute(
                            product.id
                        )}"
                    >
                        ${quantity}
                    </span>


                    <button
                        type="button"
                        class="quantity-btn plus-btn"
                        data-action="increase"
                        data-product-id="${escapeAttribute(
                            product.id
                        )}"
                    >
                        +
                    </button>

                </div>

            </div>

        </article>

    `;

}


/* =========================================================
   CART QUANTITY
   ========================================================= */

function getCartQuantity(
    productId
) {

    const quantity =
        Number(
            state.cart[
                productId
            ] || 0
        );


    if (
        !Number.isFinite(
            quantity
        ) ||
        quantity < 0
    ) {

        return 0;

    }


    return Math.floor(
        quantity
    );

}


/* =========================================================
   SET CART QUANTITY
   ========================================================= */

function setCartQuantity(
    productId,
    quantity
) {

    const safeQuantity =
        Math.max(
            0,
            Math.floor(
                Number(
                    quantity
                ) || 0
            )
        );


    if (
        safeQuantity === 0
    ) {

        delete state.cart[
            productId
        ];

    } else {

        state.cart[
            productId
        ] =
            safeQuantity;

    }


    saveCart();

    updateQuantityDisplay(
        productId
    );

    updateCartBadge();

}


/* =========================================================
   INCREASE
   ========================================================= */

function increaseQuantity(
    productId
) {

    const product =
        findProduct(
            productId
        );


    if (!product) {

        return;

    }


    if (
        !state.selectedLocation
    ) {

        showLocationScreen();

        showToast(
            "Choose a Juice Robo location first.",
            true
        );

        return;

    }


    setCartQuantity(
        productId,
        getCartQuantity(
            productId
        ) + 1
    );


    renderProducts();

    updateCartBadge();

}


/* =========================================================
   DECREASE
   ========================================================= */

function decreaseQuantity(
    productId
) {

    const quantity =
        getCartQuantity(
            productId
        );


    if (
        quantity <= 0
    ) {

        return;

    }


    setCartQuantity(
        productId,
        quantity - 1
    );


    renderProducts();

    updateCartBadge();

}


/* =========================================================
   UPDATE QUANTITY DISPLAY
   ========================================================= */

function updateQuantityDisplay(
    productId
) {

    const quantity =
        getCartQuantity(
            productId
        );


    document
        .querySelectorAll(
            `[data-quantity="${CSS.escape(
                productId
            )}"]`
        )
        .forEach(
            element => {

                element.textContent =
                    quantity;

            }
        );

}


/* =========================================================
   PRODUCT HELPER
   ========================================================= */

function findProduct(
    productId
) {

    return (
        PRODUCTS.find(
            product =>
                product.id ===
                productId
        ) ||
        null
    );

}


/* =========================================================
   CART ITEMS
   ========================================================= */

function getCartItems() {

    return PRODUCTS

        .filter(
            product =>
                getCartQuantity(
                    product.id
                ) > 0
        )

        .map(
            product => {

                const quantity =
                    getCartQuantity(
                        product.id
                    );


                return {

                    ...product,

                    quantity,

                    subtotal:
                        product.price *
                        quantity

                };

            }
        );

}


/* =========================================================
   CART COUNT
   ========================================================= */

function getCartItemCount() {

    return getCartItems()
        .reduce(
            (
                total,
                item
            ) =>
                total +
                item.quantity,
            0
        );

}


/* =========================================================
   CART SUBTOTAL
   ========================================================= */

function getCartSubtotal() {

    return getCartItems()
        .reduce(
            (
                total,
                item
            ) =>
                total +
                item.subtotal,
            0
        );

}


/* =========================================================
   CART TOTAL
   ========================================================= */

function getCartTotal() {

    return getCartSubtotal();

}


/* =========================================================
   CART BADGE
   ========================================================= */

function updateCartBadge() {

    const count =
        getCartItemCount();


    document
        .querySelectorAll(
            ".cart-count, .cart-badge, [data-cart-count]"
        )
        .forEach(
            element => {

                element.textContent =
                    count;


                element.classList.toggle(
                    "visible",
                    count > 0
                );

            }
        );


    const menuCount =
        $("menu-cart-count");


    if (menuCount) {

        menuCount.textContent =
            `${count}${
                count === 1
                    ? " item"
                    : " items"
            }`;

    }

}


/* =========================================================
   CART SCREEN
   ========================================================= */

function showCartScreen() {

    if (
        !state.selectedLocation
    ) {

        showLocationScreen();

        return;

    }


    state.screen =
        "cart";


    hideDynamicScreens();


    const screen =
        ensureCartScreen();


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


    renderCart();

}


/* =========================================================
   CART SCREEN ELEMENT
   ========================================================= */

function ensureCartScreen() {

    let screen =
        $("cart-screen");


    if (!screen) {

        screen =
            document.createElement(
                "section"
            );

        screen.id =
            "cart-screen";

        document.body.appendChild(
            screen
        );

    }


    return screen;

}


/* =========================================================
   RENDER CART
   ========================================================= */

function renderCart() {

    const screen =
        ensureCartScreen();


    const items =
        getCartItems();


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
                    Your Cart
                </h1>

                <div></div>

            </header>


            <main class="secondary-content">

                ${
                    items.length === 0

                        ? `
                            <div class="empty-state">

                                <div class="empty-icon">
                                    🛒
                                </div>

                                <h2>
                                    Your cart is empty
                                </h2>

                                <p>
                                    Add some fresh juice to continue.
                                </p>

                                <button
                                    type="button"
                                    class="primary-btn"
                                    data-action="back-menu"
                                >
                                    VIEW MENU
                                </button>

                            </div>
                        `

                        : `

                            <div class="cart-items">

                                ${items
                                    .map(
                                        renderCartItem
                                    )
                                    .join("")
                                }

                            </div>


                            ${renderCartSummary()}

                        `
                }

            </main>

        </div>

    `;

}


/* =========================================================
   CART ITEM
   ========================================================= */

function renderCartItem(
    item
) {

    return `

        <article
            class="cart-item"
        >

            <div
                class="cart-item-image"
            >

                <img
                    src="${escapeAttribute(
                        item.image
                    )}"
                    alt="${escapeAttribute(
                        item.name
                    )}"
                >

            </div>


            <div
                class="cart-item-info"
            >

                <h3>
                    ${escapeHTML(
                        item.name
                    )}
                </h3>

                <p>
                    ₹${formatMoney(
                        item.price
                    )}
                </p>

                <strong>
                    ₹${formatMoney(
                        item.subtotal
                    )}
                </strong>

            </div>


            <div
                class="quantity-control"
            >

                <button
                    type="button"
                    data-action="decrease"
                    data-product-id="${escapeAttribute(
                        item.id
                    )}"
                >
                    −
                </button>


                <span>
                    ${item.quantity}
                </span>


                <button
                    type="button"
                    data-action="increase"
                    data-product-id="${escapeAttribute(
                        item.id
                    )}"
                >
                    +
                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   CART SUMMARY
   ========================================================= */

function renderCartSummary() {

    return `

        <div class="cart-summary">

            <div class="summary-row">

                <span>
                    Items
                </span>

                <strong>
                    ${getCartItemCount()}
                </strong>

            </div>


            <div class="summary-row">

                <span>
                    Total
                </span>

                <strong>
                    ₹${formatMoney(
                        getCartTotal()
                    )}
                </strong>

            </div>


            <button
                type="button"
                class="checkout-btn"
                data-action="checkout"
            >
                CHECKOUT
            </button>


            <button
                type="button"
                class="secondary-btn"
                data-action="clear-cart"
            >
                CLEAR CART
            </button>

        </div>

    `;

}


/* =========================================================
   CHECKOUT
   ========================================================= */

function showCheckoutScreen() {

    if (
        !state.selectedLocation
    ) {

        showLocationScreen();

        return;

    }


    if (
        !state.selectedMachine
    ) {

        state.selectedMachine =
            getMachineForLocation(
                state.selectedLocation.id
            );

    }


    if (
        !state.selectedMachine
    ) {

        showToast(
            "No Juice Robo machine is available.",
            true
        );

        return;

    }


    if (
        getCartItemCount() ===
        0
    ) {

        showToast(
            "Your cart is empty.",
            true
        );

        return;

    }


    state.screen =
        "checkout";


    hideDynamicScreens();


    const screen =
        ensureCheckoutScreen();


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


    renderCheckout();

}


/* =========================================================
   CHECKOUT ELEMENT
   ========================================================= */

function ensureCheckoutScreen() {

    let screen =
        $("checkout-screen");


    if (!screen) {

        screen =
            document.createElement(
                "section"
            );

        screen.id =
            "checkout-screen";

        document.body.appendChild(
            screen
        );

    }


    return screen;

}


/* =========================================================
   CHECKOUT RENDER
   ========================================================= */

function renderCheckout() {

    const screen =
        ensureCheckoutScreen();


    const items =
        getCartItems();


    screen.innerHTML = `

        <div class="secondary-page">

            <header class="secondary-header">

                <button
                    type="button"
                    class="header-back-btn"
                    data-action="back-cart"
                >
                    ←
                </button>

                <h1>
                    Checkout
                </h1>

                <div></div>

            </header>


            <main class="checkout-content">


                <section class="checkout-section">

                    <h3>
                        Your Details
                    </h3>


                    <div class="form-card">

                        <label>
                            Name
                        </label>

                        <input
                            id="checkout-name"
                            type="text"
                            placeholder="Enter your name"
                            value="${escapeAttribute(
                                state.user.name
                            )}"
                        >


                        <label>
                            Phone number
                        </label>

                        <input
                            id="checkout-phone"
                            type="tel"
                            inputmode="numeric"
                            maxlength="10"
                            placeholder="10-digit mobile number"
                            value="${escapeAttribute(
                                state.user.phone
                            )}"
                        >


                        <label>
                            Email
                            <span>
                                optional
                            </span>
                        </label>

                        <input
                            id="checkout-email"
                            type="email"
                            placeholder="you@example.com"
                            value="${escapeAttribute(
                                state.user.email
                            )}"
                        >

                    </div>

                </section>


                <section class="checkout-section">

                    <h3>
                        Collection Location
                    </h3>


                    <div class="checkout-location-card">

                        <strong>
                            ${escapeHTML(
                                state.selectedLocation.name
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                state.selectedLocation.address
                            )}
                        </span>

                        <small>
                            Machine:
                            ${escapeHTML(
                                state.selectedMachine.machineCode
                            )}
                        </small>

                    </div>

                </section>


                <section class="checkout-section">

                    <h3>
                        Order Summary
                    </h3>


                    <div class="order-summary">

                        ${items
                            .map(
                                item => `
                                    <div class="summary-row">

                                        <span>
                                            ${escapeHTML(
                                                item.name
                                            )}
                                            × ${item.quantity}
                                        </span>

                                        <strong>
                                            ₹${formatMoney(
                                                item.subtotal
                                            )}
                                        </strong>

                                    </div>
                                `
                            )
                            .join("")
                        }


                        <div class="summary-divider"></div>


                        <div
                            class="summary-row total-row"
                        >

                            <span>
                                Total
                            </span>

                            <strong>
                                ₹${formatMoney(
                                    getCartTotal()
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                <section
                    class="payment-info"
                >

                    <strong>
                        Pay when you collect
                    </strong>

                    <p>
                        Your order will be prepared
                        and you can pay at the Juice Robo
                        machine when collecting it.
                    </p>

                </section>


                <button
                    type="button"
                    class="primary-btn confirm-order-btn"
                    data-action="place-order"
                    ${state.placingOrder
                        ? "disabled"
                        : ""}
                >

                    ${
                        state.placingOrder
                            ? "CREATING ORDER..."
                            : "CONFIRM ORDER"
                    }

                </button>


            </main>

        </div>

    `;

}


/* =========================================================
   PLACE ORDER
   ========================================================= */

async function placeOrder() {

    if (
        state.placingOrder
    ) {

        return;

    }


    /*
    ----------------------------------------------------------
    VALIDATE LOCATION
    ----------------------------------------------------------
    */

    if (
        !state.selectedLocation
    ) {

        showToast(
            "Please select a location.",
            true
        );

        showLocationScreen();

        return;

    }


    /*
    ----------------------------------------------------------
    VALIDATE MACHINE
    ----------------------------------------------------------
    */

    if (
        !state.selectedMachine
    ) {

        state.selectedMachine =
            getMachineForLocation(
                state.selectedLocation.id
            );

    }


    if (
        !state.selectedMachine
    ) {

        showToast(
            "No Juice Robo machine is available.",
            true
        );

        return;

    }


    /*
    ----------------------------------------------------------
    VALIDATE CART
    ----------------------------------------------------------
    */

    const items =
        getCartItems();


    if (
        items.length === 0
    ) {

        showToast(
            "Your cart is empty.",
            true
        );

        return;

    }


    /*
    ----------------------------------------------------------
    READ CUSTOMER
    ----------------------------------------------------------
    */

    const nameInput =
        $("checkout-name");

    const phoneInput =
        $("checkout-phone");

    const emailInput =
        $("checkout-email");


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const phone =
        phoneInput
            ? phoneInput.value.trim()
            : "";


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    /*
    ----------------------------------------------------------
    VALIDATION
    ----------------------------------------------------------
    */

    if (!name) {

        showToast(
            "Please enter your name.",
            true
        );

        nameInput?.focus();

        return;

    }


    if (
        !isValidPhone(phone)
    ) {

        showToast(
            "Please enter a valid 10-digit phone number.",
            true
        );

        phoneInput?.focus();

        return;

    }


    if (
        email &&
        !isValidEmail(email)
    ) {

        showToast(
            "Please enter a valid email address.",
            true
        );

        emailInput?.focus();

        return;

    }


    /*
    ----------------------------------------------------------
    SAVE USER LOCALLY
    ----------------------------------------------------------
    */

    state.user.name =
        name;

    state.user.phone =
        phone;

    state.user.email =
        email;


    saveUser();


    /*
    ----------------------------------------------------------
    CREATE CUSTOMER
    ----------------------------------------------------------
    */

    state.placingOrder =
        true;


    renderCheckout();


    try {

        console.log(
            "Creating customer..."
        );


        const customer =
            await JuiceRoboAPI.createCustomer({

                name,

                phone,

                email

            });


        if (
            !customer ||
            !customer.id
        ) {

            throw new Error(
                "Customer could not be created."
            );

        }


        state.user.id =
            String(
                customer.id
            );


        saveUser();


        /*
        ------------------------------------------------------
        BUILD ORDER ITEMS
        ------------------------------------------------------
        */

        const orderItems =
            items.map(
                item => ({

                    productId:
                        item.id,

                    quantity:
                        item.quantity

                })
            );


        console.log(
            "Creating order:",
            orderItems
        );


        /*
        ------------------------------------------------------
        CREATE REAL BACKEND ORDER
        ------------------------------------------------------
        */

        const backendOrder =
            await JuiceRoboAPI.createOrder({

                locationId:
                    state.selectedLocation.id,

                machineId:
                    state.selectedMachine.id,

                customerId:
                    customer.id,

                items:
                    orderItems

            });


        console.log(
            "Backend order created:",
            backendOrder
        );


        /*
        ------------------------------------------------------
        BUILD LOCAL HISTORY OBJECT
        ------------------------------------------------------
        */

        const historyOrder = {

            id:
                backendOrder.id,

            backendId:
                backendOrder.id,

            orderNumber:
                backendOrder.order_number,

            createdAt:
                new Date().toISOString(),

            customer: {

                name,

                phone,

                email

            },

            location: {

                id:
                    state.selectedLocation.id,

                name:
                    state.selectedLocation.name,

                address:
                    state.selectedLocation.address

            },

            machine: {

                id:
                    state.selectedMachine.id,

                code:
                    state.selectedMachine.machineCode,

                name:
                    state.selectedMachine.name

            },

            items:
                backendOrder.items ||
                items.map(
                    item => ({

                        product_id:
                            item.id,

                        product_name:
                            item.name,

                        quantity:
                            item.quantity,

                        unit_price:
                            item.price,

                        subtotal:
                            item.subtotal

                    })
                ),

            total:
                Number(
                    backendOrder.total_amount ||
                    getCartTotal()
                ),

            paymentStatus:
                backendOrder.payment_status ||
                "PENDING",

            orderStatus:
                backendOrder.order_status ||
                "PAYMENT_PENDING"

        };


        /*
        ------------------------------------------------------
        SAVE HISTORY
        ------------------------------------------------------
        */

        state.history.unshift(
            historyOrder
        );


        /*
         * Keep local history limited.
         */

        state.history =
            state.history.slice(
                0,
                40
            );


        saveHistory();


        /*
        ------------------------------------------------------
        CLEAR CART
        ------------------------------------------------------
        */

        state.cart =
            {};

        saveCart();


        updateCartBadge();


        /*
        ------------------------------------------------------
        SHOW CONFIRMATION
        ------------------------------------------------------
        */

        state.placingOrder =
            false;


        showOrderConfirmation(
            historyOrder
        );


    } catch (error) {

        console.error(
            "Order creation failed:",
            error
        );


        state.placingOrder =
            false;


        renderCheckout();


        showToast(
            error.message ||
            "Unable to create order.",
            true
        );

    }

}


/* =========================================================
   ORDER CONFIRMATION
   ========================================================= */

function showOrderConfirmation(
    order
) {

    state.screen =
        "confirmation";


    hideDynamicScreens();


    const screen =
        ensureConfirmationScreen();


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


    const orderNumber =
        order.orderNumber ||
        order.id;


    screen.innerHTML = `

        <div class="confirmation-page">


            <div class="confirmation-icon">
                ✓
            </div>


            <h1>
                Order Confirmed
            </h1>


            <p class="confirmation-message">
                Your Juice Robo order has been created successfully.
            </p>


            <div class="order-number-card">

                <span>
                    ORDER NUMBER
                </span>

                <strong>
                    ${escapeHTML(
                        orderNumber
                    )}
                </strong>

            </div>


            <div class="confirmation-location">

                <strong>
                    ${escapeHTML(
                        order.location.name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        order.location.address
                    )}
                </span>

                <small>
                    Machine:
                    ${escapeHTML(
                        order.machine.code
                    )}
                </small>

            </div>


            <div class="confirmation-total">

                <span>
                    Total
                </span>

                <strong>
                    ₹${formatMoney(
                        order.total
                    )}
                </strong>

            </div>


            <div class="confirmation-status">

                <strong>
                    Payment
                </strong>

                <span>
                    ${escapeHTML(
                        order.paymentStatus
                    )}
                </span>


                <strong>
                    Order
                </strong>

                <span>
                    ${escapeHTML(
                        order.orderStatus
                    )}
                </span>

            </div>


            <div class="collection-code-notice">

                <strong>
                    Collection code
                </strong>

                <p>
                    The collection-code system will be
                    connected to the machine backend next.
                </p>

            </div>


            <button
                type="button"
                class="primary-btn"
                data-action="back-menu"
            >
                BACK TO MENU
            </button>


            <button
                type="button"
                class="secondary-btn"
                data-action="show-history"
            >
                VIEW ORDER HISTORY
            </button>


        </div>

    `;

}


/* =========================================================
   CONFIRMATION ELEMENT
   ========================================================= */

function ensureConfirmationScreen() {

    let screen =
        $("confirmation-screen");


    if (!screen) {

        screen =
            document.createElement(
                "section"
            );

        screen.id =
            "confirmation-screen";

        document.body.appendChild(
            screen
        );

    }


    return screen;

}


/* =========================================================
   HISTORY SCREEN
   ========================================================= */

async function showHistoryScreen() {

    state.screen =
        "history";


    hideDynamicScreens();


    const screen =
        ensureHistoryScreen();


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


    renderHistory();


    /*
     * Try to refresh history from backend.
     */

    try {

        const orders =
            await JuiceRoboAPI.getOrders();


        if (
            Array.isArray(
                orders
            )
        ) {

            const backendHistory =
                orders.map(
                    normalizeBackendOrder
                );


            /*
             * Merge backend history with
             * local history.
             */

            mergeBackendHistory(
                backendHistory
            );


            renderHistory();

        }

    } catch (error) {

        console.warn(
            "Could not refresh order history:",
            error
        );

    }

}


/* =========================================================
   HISTORY ELEMENT
   ========================================================= */

function ensureHistoryScreen() {

    let screen =
        $("history-screen");


    if (!screen) {

        screen =
            document.createElement(
                "section"
            );

        screen.id =
            "history-screen";

        document.body.appendChild(
            screen
        );

    }


    return screen;

}


/* =========================================================
   NORMALIZE BACKEND ORDER
   ========================================================= */

function normalizeBackendOrder(
    order
) {

    const location =
        LOCATIONS.find(
            item =>
                item.id ===
                order.location_id
        );


    const machine =
        MACHINES.find(
            item =>
                item.id ===
                order.machine_id
        );


    const items =
        Array.isArray(
            order.items
        )
            ? order.items
            : [];


    return {

        id:
            order.id,

        backendId:
            order.id,

        orderNumber:
            order.order_number,

        createdAt:
            order.created_at ||
            null,

        location: {

            id:
                order.location_id,

            name:
                location?.name ||
                "Juice Robo",

            address:
                location?.address ||
                ""

        },

        machine: {

            id:
                order.machine_id,

            code:
                machine?.machineCode ||
                "",

            name:
                machine?.name ||
                ""

        },

        items,

        total:
            Number(
                order.total_amount ||
                0
            ),

        paymentStatus:
            order.payment_status ||
            "PENDING",

        orderStatus:
            order.order_status ||
            "PAYMENT_PENDING"

    };

}


/* =========================================================
   MERGE HISTORY
   ========================================================= */

function mergeBackendHistory(
    backendOrders
) {

    const combined =
        [
            ...backendOrders,
            ...state.history
        ];


    const unique =
        new Map();


    combined.forEach(
        order => {

            const key =
                order.id ||
                order.orderNumber;


            if (
                key &&
                !unique.has(
                    key
                )
            ) {

                unique.set(
                    key,
                    order
                );

            }

        }
    );


    state.history =
        Array.from(
            unique.values()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.createdAt ||
                        0
                    ) -
                    new Date(
                        a.createdAt ||
                        0
                    )
            )
            .slice(
                0,
                40
            );


    saveHistory();

}


/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory() {

    const screen =
        ensureHistoryScreen();


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
                    Order History
                </h1>

                <div></div>

            </header>


            <main class="secondary-content">

                ${
                    state.history.length === 0

                        ? renderEmptyHistory()

                        : state.history
                            .map(
                                renderHistoryOrder
                            )
                            .join("")
                }

            </main>

        </div>

    `;

}


/* =========================================================
   EMPTY HISTORY
   ========================================================= */

function renderEmptyHistory() {

    return `

        <div class="empty-state">

            <div class="empty-icon">
                🧾
            </div>

            <h2>
                No orders yet
            </h2>

            <p>
                Your Juice Robo orders will appear here.
            </p>

            <button
                type="button"
                class="primary-btn"
                data-action="back-menu"
            >
                ORDER JUICE
            </button>

        </div>

    `;

}


/* =========================================================
   HISTORY ORDER CARD
   ========================================================= */

function renderHistoryOrder(
    order
) {

    const itemCount =
        Array.isArray(
            order.items
        )
            ? order.items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.quantity ||
                        0
                    ),
                0
            )
            : 0;


    const date =
        formatDate(
            order.createdAt
        );


    return `

        <article
            class="history-card"
            data-action="view-order"
            data-order-id="${escapeAttribute(
                order.id
            )}"
        >

            <div class="history-card-icon">
                🥤
            </div>


            <div class="history-card-content">

                <strong>
                    ${escapeHTML(
                        order.orderNumber ||
                        order.id
                    )}
                </strong>

                <span>
                    ${itemCount}
                    ${
                        itemCount === 1
                            ? " item"
                            : " items"
                    }
                    ·
                    ${escapeHTML(
                        date
                    )}
                </span>

                <small>
                    ${escapeHTML(
                        order.orderStatus ||
                        "PAYMENT_PENDING"
                    )}
                </small>

            </div>


            <div class="history-card-total">

                ₹${formatMoney(
                    order.total
                )}

            </div>

        </article>

    `;

}


/* =========================================================
   VIEW ORDER
   ========================================================= */

async function viewOrder(
    orderId
) {

    if (!orderId) {

        return;

    }


    try {

        const order =
            await JuiceRoboAPI.getOrder(
                orderId
            );


        const normalized =
            normalizeBackendOrder(
                order
            );


        showOrderDetails(
            normalized
        );


    } catch (error) {

        console.error(
            error
        );


        const localOrder =
            state.history.find(
                item =>
                    item.id ===
                    orderId
            );


        if (localOrder) {

            showOrderDetails(
                localOrder
            );

        } else {

            showToast(
                "Unable to load order.",
                true
            );

        }

    }

}


/* =========================================================
   ORDER DETAILS
   ========================================================= */

function showOrderDetails(
    order
) {

    state.screen =
        "confirmation";


    hideDynamicScreens();


    const screen =
        ensureConfirmationScreen();


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


    const items =
        Array.isArray(
            order.items
        )
            ? order.items
            : [];


    screen.innerHTML = `

        <div class="confirmation-page">

            <button
                type="button"
                class="header-back-btn"
                data-action="show-history"
            >
                ←
            </button>


            <div class="confirmation-icon">
                ✓
            </div>


            <h1>
                Order Details
            </h1>


            <div class="order-number-card">

                <span>
                    ORDER NUMBER
                </span>

                <strong>
                    ${escapeHTML(
                        order.orderNumber ||
                        order.id
                    )}
                </strong>

            </div>


            <div class="confirmation-location">

                <strong>
                    ${escapeHTML(
                        order.location.name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        order.location.address
                    )}
                </span>

            </div>


            <div class="ticket-items">

                ${items
                    .map(
                        item => `

                            <div class="ticket-item-row">

                                <span>
                                    ${escapeHTML(
                                        item.product_name ||
                                        item.productName ||
                                        ""
                                    )}
                                    ×
                                    ${Number(
                                        item.quantity ||
                                        0
                                    )}
                                </span>

                                <strong>
                                    ₹${formatMoney(
                                        item.subtotal ||
                                        0
                                    )}
                                </strong>

                            </div>

                        `
                    )
                    .join("")
                }

            </div>


            <div class="confirmation-total">

                <span>
                    Total
                </span>

                <strong>
                    ₹${formatMoney(
                        order.total
                    )}
                </strong>

            </div>


            <div class="confirmation-status">

                <strong>
                    Payment
                </strong>

                <span>
                    ${escapeHTML(
                        order.paymentStatus
                    )}
                </span>


                <strong>
                    Order
                </strong>

                <span>
                    ${escapeHTML(
                        order.orderStatus
                    )}
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {

    state.cart =
        {};

    saveCart();

    updateCartBadge();

    renderProducts();

}


/* =========================================================
   CLEAR CART CONFIRMATION
   ========================================================= */

function handleClearCart() {

    if (
        getCartItemCount() ===
        0
    ) {

        showToast(
            "Cart is already empty."
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Remove all items from your cart?"
        );


    if (!confirmed) {

        return;

    }


    clearCart();


    if (
        state.screen ===
        "cart"
    ) {

        renderCart();

    }


    showToast(
        "Cart cleared."
    );

}


/* =========================================================
   LOCAL STORAGE — CART
   ========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            STORAGE_KEYS.cart,
            JSON.stringify(
                state.cart
            )
        );

    } catch (error) {

        console.error(
            "Could not save cart:",
            error
        );

    }

}


function loadCart() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEYS.cart
            );


        if (!raw) {

            state.cart =
                {};

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

            state.cart =
                {};

        }

    } catch (error) {

        console.error(
            "Could not load cart:",
            error
        );

        state.cart =
            {};

    }

}


/* =========================================================
   LOCAL STORAGE — LOCATION
   ========================================================= */

function saveSelectedLocation() {

    try {

        if (
            !state.selectedLocation ||
            !state.selectedMachine
        ) {

            console.warn(
                "Juice Robo: Nothing to save."
            );

            return;

        }


        const selectedLocationData = {

            location: {
                ...state.selectedLocation
            },

            machine: {
                ...state.selectedMachine
            }

        };


        localStorage.setItem(
            "juiceRoboSelectedLocation",
            JSON.stringify(
                selectedLocationData
            )
        );


        console.log(
            "Juice Robo: Selected location saved:",
            selectedLocationData
        );

    } catch (error) {

        console.error(
            "Juice Robo: Failed to save selected location:",
            error
        );

    }

}


function loadSelectedLocation() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEYS.location
            );


        if (!raw) {

            state.selectedLocation =
                null;

            state.selectedMachine =
                null;

            return;

        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            parsed &&
            parsed.location
        ) {

            state.selectedLocation =
                parsed.location;

            state.selectedMachine =
                parsed.machine ||
                null;

        } else {

            state.selectedLocation =
                parsed;

            state.selectedMachine =
                null;

        }

    } catch (error) {

        console.error(
            "Could not load location:",
            error
        );

        state.selectedLocation =
            null;

        state.selectedMachine =
            null;

    }

}


/* =========================================================
   LOCAL STORAGE — HISTORY
   ========================================================= */

function saveHistory() {

    try {

        localStorage.setItem(
            STORAGE_KEYS.history,
            JSON.stringify(
                state.history
            )
        );

    } catch (error) {

        console.error(
            "Could not save history:",
            error
        );

    }

}


function loadHistory() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEYS.history
            );


        if (!raw) {

            state.history =
                [];

            return;

        }


        const parsed =
            JSON.parse(
                raw
            );


        state.history =
            Array.isArray(
                parsed
            )
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Could not load history:",
            error
        );

        state.history =
            [];

    }

}


/* =========================================================
   LOCAL STORAGE — USER
   ========================================================= */

function saveUser() {

    try {

        localStorage.setItem(
            STORAGE_KEYS.user,
            JSON.stringify(
                state.user
            )
        );

    } catch (error) {

        console.error(
            "Could not save user:",
            error
        );

    }

}


function loadUser() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEYS.user
            );


        if (!raw) {

            return;

        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            parsed &&
            typeof parsed ===
                "object"
        ) {

            state.user =
                {

                    ...state.user,

                    ...parsed

                };

        }

    } catch (error) {

        console.error(
            "Could not load user:",
            error
        );

    }

}


/* =========================================================
   VALIDATION
   ========================================================= */

function isValidPhone(
    value
) {

    return /^[6-9]\d{9}$/.test(
        value
    );

}


function isValidEmail(
    value
) {

    if (!value) {

        return true;

    }


    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            value
        );

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "Recently";

    }


    try {

        return new Date(
            value
        ).toLocaleString(
            "en-IN",
            {

                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

    } catch {

        return "";

    }

}


/* =========================================================
   DYNAMIC SCREENS
   ========================================================= */

function ensureDynamicScreens() {

    ensureCartScreen();

    ensureCheckoutScreen();

    ensureHistoryScreen();

    ensureConfirmationScreen();

}


/* =========================================================
   HIDE DYNAMIC SCREENS
   ========================================================= */

function hideDynamicScreens() {

    [

        "cart-screen",

        "checkout-screen",

        "history-screen",

        "confirmation-screen"

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
        "history-mode",
        "confirmation-mode"
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

    /*
     * Prevent duplicate listeners.
     */
    if (window.__juiceRoboEventsReady) {

        console.log(
            "Juice Robo: Event delegation already initialized."
        );

        return;

    }


    window.__juiceRoboEventsReady = true;


    /*
     * -------------------------------------------------------
     * GLOBAL CLICK HANDLER
     * -------------------------------------------------------
     */

    document.addEventListener(
        "click",
        handleGlobalClick
    );


}


/* =========================================================
   GLOBAL CLICK HANDLER
   ========================================================= */

function handleGlobalClick(
    event
    
) {

    /*
     * Find the closest element containing
     * a data-action attribute.
     */

    const target =
        event.target.closest(
            "[data-action]"
        );


    /*
     * No data-action means there is
     * nothing for this handler to process.
     */

    if (!target) {

        return;

    }


    /*
     * Read action and related data.
     */

    const action =
        target.dataset.action;


    const productId =
        target.dataset.productId;


    const locationId =
        target.dataset.locationId;


    const orderId =
        target.dataset.orderId;


    /*
     * Debug information.
     */

    console.log(
        "Juice Robo: Global action:",
        action
    );


    /*
     * -------------------------------------------------------
     * ACTION ROUTER
     * -------------------------------------------------------
     */

    switch (action) {


        /* ---------------------------------------------------
           PRODUCT QUANTITY
           --------------------------------------------------- */

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


        /* ---------------------------------------------------
           LOCATION
           --------------------------------------------------- */

        case "show-location":

            console.log(
                "Juice Robo: Opening location screen."
            );


            showLocationScreen();

            break;

        case "location-back":

        console.log(
            "Juice Robo: Location back clicked."
        );

        if (
            state.selectedLocation
        ) {

            showMenuScreen();

        }

        break;


        case "select-location":

            console.log(
                "Juice Robo: Selecting location:",
                locationId
            );


            selectLocation(
                locationId
            );

            break;


        /* ---------------------------------------------------
           CART
           --------------------------------------------------- */

        case "show-cart":

            showCartScreen();

            break;


        case "back-cart":

            showCartScreen();

            break;


        case "clear-cart":

            handleClearCart();

            break;


        /* ---------------------------------------------------
           MENU
           --------------------------------------------------- */

        case "back-menu":

            showMenuScreen();

            break;


        /* ---------------------------------------------------
           CHECKOUT
           --------------------------------------------------- */

        case "checkout":

            showCheckoutScreen();

            break;


        case "place-order":

            placeOrder();

            break;


        /* ---------------------------------------------------
           HISTORY
           --------------------------------------------------- */

        case "show-history":

            showHistoryScreen();

            break;


        case "view-order":

            viewOrder(
                orderId
            );

            break;


        /* ---------------------------------------------------
           BACKEND
           --------------------------------------------------- */

        case "retry-backend":

            retryBackend();

            break;


        /* ---------------------------------------------------
           UNKNOWN ACTION
           --------------------------------------------------- */

        default:

            console.warn(
                "Unknown action:",
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


    restoreSelectedLocation();


    if (
        state.selectedLocation
    ) {

        showMenuScreen();

    } else {

        showLocationScreen();

    }

}


/* =========================================================
   KEYBOARD SUPPORT
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
    typeof CSS ===
        "undefined" ||
    typeof CSS.escape !==
        "function"
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
   GLOBAL JUICE ROBO API
   ========================================================= */

    function showProfileScreen() {

    console.log(
        "Juice Robo: Opening profile screen."
    );

    state.screen = "profile";

    hideDynamicScreens();

    const screen = ensureProfileScreen();

    if (!screen) {

        console.error(
            "Juice Robo: Profile screen could not be created."
        );

        return;
    }

    screen.style.display = "flex";

    screen.classList.add("active");

    const app = document.getElementById("app");

    if (app) {

        app.style.display = "none";

        app.classList.remove("active");
    }

    renderProfile();

    document.body.classList.add(
        "profile-mode"
    );

    document.body.classList.remove(
        "menu-mode",
        "cart-mode",
        "checkout-mode",
        "confirmation-mode",
        "history-mode",
        "location-mode"
    );

    console.log(
        "Juice Robo: Profile screen opened successfully."
    );
}
/* =========================================================
   PUBLIC JUICE ROBO API
   ========================================================= */

window.JuiceRobo = {

    state,

    /* -------------------------------------------------------
       Screens
       ------------------------------------------------------- */

    showLocationScreen,

    showMenuScreen,

    showCartScreen,

    showCheckoutScreen,

    showConfirmationScreen:
        showOrderConfirmation,

    showHistoryScreen,

    showProfileScreen,


    /* -------------------------------------------------------
       Location
       ------------------------------------------------------- */

    selectLocation,


    /* -------------------------------------------------------
       Cart
       ------------------------------------------------------- */

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
    "Juice Robo JS loaded successfully."
);


/* =========================================================
   START APPLICATION
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp,
        {
            once: true
        }
    );

} else {

    initializeApp();

}