import Stripe from 'stripe';
import orderModel from "../models/orderModel.js";
import userModel from '../models/userModel.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

// Place user order for frontend
const placeOrder = async (req, res) => {
    const frontend_url = "https://fullstack-food-delivary-frontend.onrender.com";
    try {
        // Create a new order
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
        });
        await newOrder.save();

        // Clear the user's cart
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Generate line items for Stripe checkout
        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: {
                    name: item.name,
                },
                unit_amount: item.price * 100 * 80, // Convert to smallest currency unit
            },
            quantity: item.quantity,
        }));

        // Add delivery charges
        line_items.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Delivery Charges",
                },
                unit_amount: 2 * 100 * 80, // Convert to smallest currency unit
            },
            quantity: 1,
        });

        // Create a Stripe session
        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: "payment",
            success_url: `${frontend_url}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        });

        // Respond with the session URL
        res.json({ success: true, session_url: session.url });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Server Error" });
    }
};

// Verify the order after payment
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success === true) {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Not Paid" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Server Error" });
    }
};

// Get user orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Server Error" });
    }
};

// List all orders (for admin or general use)
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders }); // Corrected to return the actual orders
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Server Error" });
    }
};

const updateStatus= async(req, res)=>{
    try{
        await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status})
        res.json({success:true, message:"Status Updated"})
    }
    catch(error){
        console.log(error);
        res.json({success:false, message:"Server Error"})
        
    }
}
export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
