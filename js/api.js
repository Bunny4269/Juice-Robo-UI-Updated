"use strict";

/*
============================================================
JUICE ROBO — BACKEND API SERVICE
============================================================

Backend:
http://127.0.0.1:8000

API ENDPOINTS
------------------------------------------------------------
GET  /health

GET  /users
POST /users

GET  /locations
POST /locations

GET  /machines
POST /machines

GET  /products
POST /products

GET  /orders
POST /orders
GET  /orders/{order_id}

POST /machines/{machine_id}/heartbeat
============================================================
*/

const JuiceRoboAPI = (() => {

    /*
    ========================================================
    CONFIGURATION
    ========================================================
    */

    const BASE_URL = "http://127.0.0.1:8000/api";


    /*
    ========================================================
    GENERIC API REQUEST
    ========================================================
    */

    async function request(endpoint, options = {}) {

        const url = `${BASE_URL}${endpoint}`;

        const method =
            options.method || "GET";


        console.log(
            `[Juice Robo API] ${method} ${url}`
        );


        try {

            /*
            ------------------------------------------------
            BUILD HEADERS
            ------------------------------------------------
            */

            const headers = {

                "Accept":
                    "application/json",

                ...(options.headers || {})
            };


            /*
            ------------------------------------------------
            ONLY ADD JSON CONTENT-TYPE WHEN
            THERE IS ACTUALLY A REQUEST BODY
            ------------------------------------------------
            */

            if (options.body) {

                headers["Content-Type"] =
                    "application/json";
            }


            /*
            ------------------------------------------------
            SEND REQUEST
            ------------------------------------------------
            */

            const response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers
                    }
                );


            /*
            ------------------------------------------------
            READ RESPONSE
            ------------------------------------------------
            */

            let data = null;

            const contentType =
                response.headers.get(
                    "content-type"
                );


            if (
                contentType &&
                contentType.includes(
                    "application/json"
                )
            ) {

                data =
                    await response.json();

            } else {

                const text =
                    await response.text();

                data =
                    text || null;
            }


            /*
            ------------------------------------------------
            HANDLE HTTP ERRORS
            ------------------------------------------------
            */

            if (!response.ok) {

                const message =
                    data?.detail ||
                    data?.message ||
                    `API request failed with status ${response.status}`;

                throw new Error(message);
            }


            /*
            ------------------------------------------------
            SUCCESS
            ------------------------------------------------
            */

            return data;


        } catch (error) {

            console.error(
                `[Juice Robo API] ${endpoint}`,
                error
            );

            throw error;
        }
    }


    /*
    ========================================================
    HEALTH
    ========================================================
    */

    async function health() {

        return request(
            "/health"
        );
    }


    /*
    ========================================================
    PRODUCTS
    ========================================================
    */
    async function getProducts() {

    const data =
        await request(
            "/products"
        );


    if (!Array.isArray(data)) {

        return [];
    }


    return data
        .filter(
            product =>
                product &&
                product.is_available !== false
        )
        .map(
            product => {

                const imageUrl =
                    String(
                        product.image_url || ""
                    );


                return {

                    id:
                        String(
                            product.id
                        ),

                    name:
                        String(
                            product.name || ""
                        ),

                    description:
                        String(
                            product.description || ""
                        ),

                    productType:
                        String(
                            product.product_type || ""
                        ),

                    price:
                        Number(
                            product.price || 0
                        ),

                    image_url:
                        imageUrl,

                    // Compatibility with the
                    // existing legacy app.js code.
                    image:
                        imageUrl,

                    isAvailable:
                        product.is_available !== false

                };

            }
        );
}
    /*
    ========================================================
    LOCATIONS
    ========================================================
    */

    async function getLocations() {

        const data =
            await request(
                "/locations"
            );


        if (!Array.isArray(data)) {

            return [];
        }


        return data
            .filter(
                location =>
                    location &&
                    location.is_active !== false
            )
            .map(
                location => ({

                    id:
                        String(
                            location.id
                        ),

                    name:
                        String(
                            location.name || ""
                        ),

                    address:
                        String(
                            location.address || ""
                        ),

                    isActive:
                        location.is_active !== false

                })
            );
    }


    /*
    ========================================================
    MACHINES
    ========================================================
    */

    async function getMachines() {

        const data =
            await request(
                "/machines"
            );


        if (!Array.isArray(data)) {

            return [];
        }


        return data.map(
            machine => ({

                id:
                    String(
                        machine.id
                    ),

                machineCode:
                    String(
                        machine.machine_code || ""
                    ),

                name:
                    String(
                        machine.name || ""
                    ),

                locationId:
                    String(
                        machine.location_id || ""
                    ),

                firmwareVersion:
                    String(
                        machine.firmware_version || ""
                    ),

                status:
                    String(
                        machine.status ||
                        "OFFLINE"
                    ),

                lastSeenAt:
                    machine.last_seen_at ||
                    null

            })
        );
    }


    /*
    ========================================================
    USERS
    ========================================================
    */

    async function getUsers() {

        const data =
            await request(
                "/users"
            );


        if (!Array.isArray(data)) {

            return [];
        }


        return data;
    }


    /*
    ========================================================
    CREATE CUSTOMER
    ========================================================
    */

    async function createCustomer({
        name,
        phone,
        email
    }) {

        if (!name) {

            throw new Error(
                "Customer name is required."
            );
        }


        if (!phone) {

            throw new Error(
                "Customer phone number is required."
            );
        }


        return request(
            "/users",
            {

                method: "POST",

                body:
                    JSON.stringify({

                        name:
                            name,

                        phone:
                            phone,

                        email:
                            email || "",

                        role:
                            "CUSTOMER"

                    })
            }
        );
    }


    /*
    ========================================================
    ORDERS — GET ALL
    ========================================================
    */

    async function getOrders() {

        const data =
            await request(
                "/orders"
            );


        if (!Array.isArray(data)) {

            return [];
        }


        return data;
    }


    /*
    ========================================================
    ORDERS — CREATE
    ========================================================
    */

    async function createOrder({
        locationId,
        machineId,
        customerId,
        items
    }) {

        /*
        ------------------------------------------------
        VALIDATION
        ------------------------------------------------
        */

        if (!locationId) {

            throw new Error(
                "Location is required."
            );
        }


        if (!machineId) {

            throw new Error(
                "Juice Robo machine is required."
            );
        }


        if (!customerId) {

            throw new Error(
                "Customer is required."
            );
        }


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            throw new Error(
                "At least one product is required."
            );
        }


        /*
        ------------------------------------------------
        CLEAN ORDER ITEMS
        ------------------------------------------------
        */

        const orderItems =
            items.map(
                item => ({

                    product_id:
                        String(
                            item.productId
                        ),

                    quantity:
                        Number(
                            item.quantity
                        )

                })
            );


        /*
        ------------------------------------------------
        CREATE ORDER
        ------------------------------------------------
        */

        return request(
            "/orders",
            {

                method: "POST",

                body:
                    JSON.stringify({

                        location_id:
                            locationId,

                        machine_id:
                            machineId,

                        customer_id:
                            customerId,

                        source:
                            "WEBSITE",

                        items:
                            orderItems

                    })
            }
        );
    }


    /*
    ========================================================
    ORDERS — GET SINGLE ORDER
    ========================================================
    */

    async function getOrder(orderId) {

        if (!orderId) {

            throw new Error(
                "Order ID is required."
            );
        }


        return request(
            `/orders/${encodeURIComponent(orderId)}`
        );
    }


    /*
    ========================================================
    MACHINE HEARTBEAT
    ========================================================
    */

    async function machineHeartbeat(
        machineId
    ) {

        if (!machineId) {

            throw new Error(
                "Machine ID is required."
            );
        }


        return request(
            `/machines/${encodeURIComponent(machineId)}/heartbeat`,
            {
                method: "POST"
            }
        );
    }


    /*
    ========================================================
    PUBLIC API
    ========================================================
    */

    return {

        BASE_URL,

        health,

        getProducts,

        getLocations,

        getMachines,

        getUsers,

        createCustomer,

        getOrders,

        createOrder,

        getOrder,

        machineHeartbeat

    };

})();


/*
============================================================
GLOBAL ACCESS
============================================================
*/

window.JuiceRoboAPI =
    JuiceRoboAPI;


console.log(
    "Juice Robo API service loaded successfully."
);