import axios from "axios";

const paymentHeader = axios.create({
    baseURL: `${process.env.RESTUARANT_SERVICE}/api/order/payment`,
    headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
    },
});

export default paymentHeader;
