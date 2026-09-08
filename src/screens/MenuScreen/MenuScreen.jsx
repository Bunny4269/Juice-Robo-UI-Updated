import "./MenuScreen.css";

/* =========================================================
   JUICE ROBO — MENU SCREEN
   ========================================================= */

const ASSET_BASE =
  String(
    import.meta.env.BASE_URL || "/"
  ).endsWith("/")
    ? String(
        import.meta.env.BASE_URL || "/"
      )
    : `${String(
        import.meta.env.BASE_URL || "/"
      )}/`;

const PRODUCT_ASSETS = {
  plain:
    "plain-juice.jpg",

  lemon:
    "lemon-juice.jpg",

  ginger:
    "ginger-juice.jpg",

  "ginger-lemon":
    "ginger-lemon-juice.jpg",
};


/* =========================================================
   GENERIC HELPERS
   ========================================================= */

function clean(value) {
  return String(
    value ?? ""
  )
    .replace(
      /\bundefined\b/gi,
      ""
    )
    .replace(
      /\bnull\b/gi,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function firstDefined(
  ...values
) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      clean(value) !== ""
  );
}


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function productSearchText(
  product = {}
) {
  const variants =
    Array.isArray(
      product?.lstVariants
    )
      ? product.lstVariants
      : Array.isArray(
          product?.variants
        )
        ? product.variants
        : [];

  return [
    product?.displayName,
    product?.name,
    product?.itemName,
    product?.productName,
    product?.product_name,
    product?.title,
    product?.description,
    product?.displayDescription,
    product?.desc,
    product?.type,
    product?.productType,
    product?.product_type,

    ...variants.flatMap(
      (variant) => [
        variant?.itemName,
        variant?.variantName,
        variant?.variantDesc,
      ]
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productType(
  product = {}
) {
  const text =
    productSearchText(
      product
    );

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return "ginger-lemon";
  }

  if (
    text.includes("ginger")
  ) {
    return "ginger";
  }

  if (
    text.includes("lemon")
  ) {
    return "lemon";
  }

  return "plain";
}

function localProductImage(
  product = {}
) {
  const filename =
    PRODUCT_ASSETS[
      productType(
        product
      )
    ];

  return `/assets/${filename}`;
}

function baseProductImage(
  product = {}
) {
  const filename =
    PRODUCT_ASSETS[
      productType(
        product
      )
    ];

  return `${ASSET_BASE}assets/${filename}`;
}

function normalizeImageUrl(
  value
) {
  const raw =
    clean(value);

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      raw
    ) ||
    raw.startsWith(
      "data:"
    ) ||
    raw.startsWith(
      "blob:"
    )
  ) {
    return raw;
  }

  if (
    raw.startsWith(
      "/assets/"
    )
  ) {
    return raw;
  }

  if (
    raw.startsWith(
      "/order_now/assets/"
    )
  ) {
    return raw;
  }

  if (
    raw.startsWith(
      "assets/"
    )
  ) {
    return `/assets/${raw.slice(
      "assets/".length
    )}`;
  }

  if (
    raw.startsWith(
      "./assets/"
    )
  ) {
    return `/assets/${raw.slice(
      "./assets/".length
    )}`;
  }

  if (
    raw.startsWith(
      "../assets/"
    )
  ) {
    return `/assets/${raw.slice(
      "../assets/".length
    )}`;
  }

  if (
    raw.startsWith(
      "/"
    )
  ) {
    return raw;
  }

  if (
    /\.(png|jpe?g|webp|gif|svg)$/i.test(
      raw
    )
  ) {
    return `/assets/${raw}`;
  }

  return raw;
}

function imageCandidates(
  product = {},
  productImage
) {
  const candidates =
    [];

  const add = (
    value
  ) => {
    const normalized =
      normalizeImageUrl(
        value
      );

    if (
      normalized &&
      !candidates.includes(
        normalized
      )
    ) {
      candidates.push(
        normalized
      );
    }
  };

  if (
    typeof productImage ===
    "function"
  ) {
    add(
      productImage(
        product
      )
    );
  }

  add(
    product?.image
  );

  add(
    product?.image_url
  );

  add(
    product?.imageUrl
  );

  add(
    product?.photo_url
  );

  add(
    product?.photoUrl
  );

  add(
    product?.thumbnail
  );

  add(
    product?.thumbnail_url
  );

  add(
    product?.thumbnailUrl
  );

  add(
    product?.itemPhoto
  );

  add(
    product?.item_photo
  );

  add(
    localProductImage(
      product
    )
  );

  add(
    baseProductImage(
      product
    )
  );

  return [
    ...new Set(
      candidates
    ),
  ];
}

function displayNameFromProduct(
  product,
  displayProductName
) {
  const generated =
    typeof displayProductName ===
    "function"
      ? clean(
          displayProductName(
            product
          )
        )
      : "";

  const apiName =
    clean(
      product?.displayName
    );

  const rawName =
    clean(
      firstDefined(
        product?.name,
        product?.itemName,
        product?.productName,
        product?.product_name,
        product?.title
      )
    );

  const usable = (
    value
  ) => {
    const text =
      clean(value);

    if (!text) {
      return false;
    }

    const lower =
      text.toLowerCase();

    return (
      lower !==
        "juice" &&
      !lower.includes(
        "undefined"
      ) &&
      !lower.includes(
        "null"
      )
    );
  };

  if (
    usable(
      apiName
    )
  ) {
    return apiName;
  }

  if (
    usable(
      generated
    )
  ) {
    return generated;
  }

  if (
    usable(
      rawName
    )
  ) {
    return rawName;
  }

  const type =
    productType(
      product
    );

  if (
    type ===
    "ginger-lemon"
  ) {
    return "Sugarcane Juice with Ginger + Lemon";
  }

  if (
    type ===
    "ginger"
  ) {
    return "Ginger Sugarcane Juice";
  }

  if (
    type ===
    "lemon"
  ) {
    return "Lemon Sugarcane Juice";
  }

  return "Plain Sugarcane Juice";
}

function descriptionFromProduct(
  product,
  displayDescription
) {
  const generated =
    typeof displayDescription ===
    "function"
      ? clean(
          displayDescription(
            product
          )
        )
      : "";

  if (
    generated
  ) {
    return generated;
  }

  const apiDescription =
    clean(
      firstDefined(
        product?.displayDescription,
        product?.description,
        product?.desc
      )
    );

  if (
    apiDescription
  ) {
    return apiDescription;
  }

  const type =
    productType(
      product
    );

  if (
    type ===
    "ginger-lemon"
  ) {
    return "A refreshing blend of ginger, lemon and fresh sugarcane.";
  }

  if (
    type ===
    "ginger"
  ) {
    return "Fresh sugarcane juice with a zing of ginger.";
  }

  if (
    type ===
    "lemon"
  ) {
    return "Fresh sugarcane juice with a refreshing lemon twist.";
  }

  return "Freshly prepared plain sugarcane juice.";
}

function priceFromProduct(
  product = {}
) {
  const variants =
    Array.isArray(
      product?.variants
    )
      ? product.variants
      : Array.isArray(
          product?.lstVariants
        )
        ? product.lstVariants
        : [];

  const availableVariants =
    variants.filter(
      (variant) =>
        variant &&
        variant?.isAvailable !==
          false &&
        variant?.is_available !==
          false
    );

  const fullVariant =
    availableVariants.find(
      (variant) =>
        clean(
          variant?.variantName ||
            variant?.name
        ).toLowerCase() ===
        "full"
    ) ||
    availableVariants[0];

  const values = [
    fullVariant?.unitPrice,
    fullVariant?.unit_price,
    fullVariant?.price,
    product?.price,
    product?.unitPrice,
    product?.unit_price,
    product?.sellingPrice,
    product?.selling_price,
    product?.amount,
  ];

  for (
    const value of values
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number =
        Number(
          value
        );

      if (
        Number.isFinite(
          number
        )
      ) {
        return number;
      }
    }
  }

  return 0;
}

function formatMoney(
  value,
  money
) {
  if (
    typeof money ===
    "function"
  ) {
    return money(
      value
    );
  }

  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN"
  )}`;
}


/* =========================================================
   LOCATION / MACHINE HELPERS
   ========================================================= */

function locationName(
  location
) {
  return (
    clean(
      firstDefined(
        location?.name,
        location?.storeName,
        location?.locationName,
        location?.outletName
      )
    ) ||
    "Selected location"
  );
}

function locationSecondary(
  location
) {
  return clean(
    firstDefined(
      location?.address,
      location?.locAddress,
      location?.storeAddress,
      location?.location,
      location?.description,
      location?.outletDesc
    )
  );
}

function machineName(
  machine
) {
  return (
    clean(
      firstDefined(
        machine?.name,
        machine?.machineName,
        machine?.machine_name,
        machine?.machineCode,
        machine?.machine_code,
        machine?.code
      )
    ) ||
    "Selected machine"
  );
}

function machineStatus(
  machine
) {
  return clean(
    firstDefined(
      machine?.status,
      machine?.machineStatus,
      machine?.machine_status
    )
  );
}


/* =========================================================
   MAIN MENU SCREEN
   ========================================================= */

export default function MenuScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  onProduct,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const safeProducts =
    Array.isArray(
      products
    )
      ? products
      : [];

  const selectedLocationName =
    locationName(
      selectedLocation
    );

  const selectedLocationAddress =
    locationSecondary(
      selectedLocation
    );

  const selectedMachineName =
    machineName(
      selectedMachine
    );

  const selectedMachineStatus =
    machineStatus(
      selectedMachine
    );

  return (
    <main
      className="
        jr-content
        jr-menu-page
      "
    >

      {/* =================================================
          WELCOME CARD
         ================================================= */}

      <section
        className="
          jr-menu-welcome
          jr-welcome
        "
      >

        <div
          className="
            jr-welcome-copy
          "
        >

          <span
            className="
              jr-eyebrow
            "
          >
            FRESHLY MADE
          </span>

          <h1>
            Your favourite
            <br />
            <em>
              juice, your way.
            </em>
          </h1>

          <p>
            Pick your juice, choose your quantity and
            collect it fresh from your Juice Robo machine.
          </p>

        </div>

        <div
          className="
            jr-welcome-icon
          "
          aria-hidden="true"
        >
          🧃
        </div>

      </section>


      {/* =================================================
          COLLECTION SUMMARY
         ================================================= */}

      <section
        className="
          jr-selected-machine-banner
        "
        aria-label="Current collection point"
      >

        <div
          className="
            jr-selected-machine-icon
          "
          aria-hidden="true"
        >
          📍
        </div>

        <div
          className="
            jr-selected-machine-copy
          "
        >

          <small>
            COLLECTING FROM
          </small>

          <strong>
            {selectedLocationAddress ||
              selectedLocationName}
          </strong>

          <span>
            {selectedMachineName}

            {selectedMachineStatus && (
              <>
                {" · "}
                {selectedMachineStatus}
              </>
            )}
          </span>

        </div>

      </section>


      {/* =================================================
          AVAILABLE JUICES
         ================================================= */}

      <section
        className="
          jr-menu-section
        "
      >

        <div
          className="
            jr-section-heading
          "
        >

          <div
            className="
              jr-section-heading-copy
            "
          >

            <span
              className="
                jr-section-eyebrow
              "
            >
              AVAILABLE JUICES
            </span>

            <h2>
              What are you craving?
            </h2>

          </div>

          <span
            className="
              jr-count
            "
            aria-label={`${safeProducts.length} juices available`}
          >
            {safeProducts.length}
          </span>

        </div>

        <p
          className="
            jr-section-subtitle
          "
        >
          Choose your favourite fresh juice.
        </p>


        {/* =================================================
            PRODUCT LIST
           ================================================= */}

        <div
          className="
            jr-products
          "
        >

          {safeProducts.length ===
          0 ? (

            <div
              className="
                jr-products-empty
              "
            >

              <span
                aria-hidden="true"
              >
                🧃
              </span>

              <strong>
                No juices available
              </strong>

              <p>
                No available products were returned by the Juice Robo API.
              </p>

            </div>

          ) : (

            safeProducts.map(
              (
                product,
                index
              ) => (

                <ProductCard
                  key={
                    product?.id ??
                    product?.variantId ??
                    product?.productId ??
                    product?.product_id ??
                    `product-${index}`
                  }

                  product={
                    product
                  }

                  onSelect={
                    onProduct
                  }

                  productImage={
                    productImage
                  }

                  displayProductName={
                    displayProductName
                  }

                  displayDescription={
                    displayDescription
                  }

                  money={
                    money
                  }
                />

              )
            )

          )}

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  product = {},
  onSelect,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const name =
    displayNameFromProduct(
      product,
      displayProductName
    );

  const description =
    descriptionFromProduct(
      product,
      displayDescription
    );

  const price =
    priceFromProduct(
      product
    );

  const candidates =
    imageCandidates(
      product,
      productImage
    );

  const initialImage =
    candidates[0] ||
    "";

  function handleSelect() {
    if (
      typeof onSelect ===
      "function"
    ) {
      onSelect(
        product
      );
    }
  }

  function handleImageError(
    event
  ) {
    const image =
      event.currentTarget;

    const currentIndex =
      Number(
        image.dataset.imageIndex ||
          0
      );

    const nextIndex =
      currentIndex +
      1;

    if (
      nextIndex <
      candidates.length
    ) {
      image.dataset.imageIndex =
        String(
          nextIndex
        );

      image.src =
        candidates[
          nextIndex
        ];

      return;
    }

    image.style.display =
      "none";

    const placeholder =
      image.parentElement?.querySelector(
        ".jr-product-image-placeholder"
      );

    if (
      placeholder
    ) {
      placeholder.style.display =
        "flex";
    }
  }

  return (
    <button
      className="
        jr-product-card
      "
      type="button"
      onClick={
        handleSelect
      }
      aria-label={`Select ${name}`}
    >

      {/* =================================================
          IMAGE
         ================================================= */}

      <div
        className="
          jr-product-image-wrap
        "
      >

        {initialImage ? (
          <>
            <img
              src={
                initialImage
              }
              alt={
                name
              }
              className="
                jr-product-image
              "
              loading="lazy"
              data-image-index="0"
              onError={
                handleImageError
              }
            />

            <div
              className="
                jr-product-image-placeholder
              "
              aria-hidden="true"
              style={{
                display:
                  "none",
              }}
            >
              🧃
            </div>
          </>
        ) : (
          <div
            className="
              jr-product-image-placeholder
            "
            aria-hidden="true"
          >
            🧃
          </div>
        )}

        <span
          className="
            jr-fresh-badge
          "
        >
          <i />
          FRESH
        </span>

      </div>


      {/* =================================================
          PRODUCT INFORMATION
         ================================================= */}

      <div
        className="
          jr-product-info
        "
      >

        <div
          className="
            jr-product-main
          "
        >

          <h3>
            {name}
          </h3>

          {description && (
            <p>
              {description}
            </p>
          )}

        </div>


        {/* =================================================
            PRICE + SELECT
           ================================================= */}

        <div
          className="
            jr-product-footer
          "
        >

          <strong
            className="
              jr-product-price
            "
          >
            {formatMoney(
              price,
              money
            )}
          </strong>

          <span
            className="
              jr-select-circle
            "
            aria-hidden="true"
          >
            +
          </span>

        </div>

      </div>

    </button>
  );
}
