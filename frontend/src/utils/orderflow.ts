
const ORDER_ACTIONS: Record<string, string[]> = {
        placed: ["accepted"],
        accepted: ["preparing"],
        preparing: ["ready_for_rider"],
            
    };
    
    export default ORDER_ACTIONS