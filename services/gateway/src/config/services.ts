interface ServiceRoute {
    prefix: string;
    target: string;
}

const serviceRoutes = (): ServiceRoute[] => [
    { prefix: "/api/auth", target: process.env.AUTH_SERVICE_URL! },
    { prefix: "/api/rider", target: process.env.RIDER_SERVICE_URL! },
    { prefix: "/api/admin", target: process.env.ADMIN_SERVICE_URL! },
    { prefix: "/api/restaurant", target: process.env.RESTAURANT_SERVICE_URL! },
    { prefix: "/api/menu-item", target: process.env.RESTAURANT_SERVICE_URL! },
    { prefix: "/api/cart", target: process.env.RESTAURANT_SERVICE_URL! },
    { prefix: "/api/address", target: process.env.RESTAURANT_SERVICE_URL! },
    { prefix: "/api/order", target: process.env.RESTAURANT_SERVICE_URL! },
    { prefix: "/api/upload", target: process.env.UTILS_SERVICE_URL! },
    { prefix: "/api/payment", target: process.env.UTILS_SERVICE_URL! },
    { prefix: "/api/ai", target: process.env.AI_SERVICE_URL! },
];

export const getServiceTarget = (path: string): string | null => {
    const route = serviceRoutes().find(
        ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`)
    );

    return route ? route.target : null;
};
