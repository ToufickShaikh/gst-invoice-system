// Test the purchase form data processing without backend calls

// Simulate form data from the Purchase component
const testFormData = {
    supplier: "60f7b1234567890123456789", // Mock supplier ID
    items: [
        {
            item: "60f7b1234567890123456788", // Mock item ID
            quantity: "5", // String from form input
            purchasePrice: "100.50" // String from form input
        },
        {
            item: "60f7b1234567890123456787", // Mock item ID
            quantity: "10", // String from form input
            purchasePrice: "75.25" // String from form input
        }
    ],
    notes: "Test purchase order"
};

console.log("Original form data:", testFormData);

// Process form data as done in the component
const processedFormData = {
    ...testFormData,
    items: testFormData.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity),
        purchasePrice: parseFloat(item.purchasePrice)
    }))
};

console.log("Processed form data:", processedFormData);

// Validate the processed data
console.log("\n--- Validation Results ---");

if (!processedFormData.supplier) {
    console.log("❌ Supplier is required");
} else {
    console.log("✅ Supplier is present");
}

if (!processedFormData.items.length) {
    console.log("❌ At least one item is required");
} else {
    console.log("✅ Items array has", processedFormData.items.length, "items");
}

for (let i = 0; i < processedFormData.items.length; i++) {
    const item = processedFormData.items[i];
    console.log(`\nItem ${i + 1}:`);
    
    if (!item.item || !item.quantity || item.purchasePrice === undefined) {
        console.log(`❌ Item ${i + 1}: Missing required fields`);
    } else {
        console.log(`✅ Item ${i + 1}: All fields present`);
    }
    
    if (isNaN(item.quantity) || item.quantity <= 0) {
        console.log(`❌ Item ${i + 1}: Invalid quantity (${item.quantity})`);
    } else {
        console.log(`✅ Item ${i + 1}: Valid quantity (${item.quantity})`);
    }
    
    if (isNaN(item.purchasePrice) || item.purchasePrice < 0) {
        console.log(`❌ Item ${i + 1}: Invalid purchase price (${item.purchasePrice})`);
    } else {
        console.log(`✅ Item ${i + 1}: Valid purchase price (${item.purchasePrice})`);
    }
}

console.log("\n--- Final Data Types ---");
processedFormData.items.forEach((item, index) => {
    console.log(`Item ${index + 1}:`);
    console.log(`  quantity: ${item.quantity} (${typeof item.quantity})`);
    console.log(`  purchasePrice: ${item.purchasePrice} (${typeof item.purchasePrice})`);
});

console.log("\n✅ Purchase form data processing test completed!");
