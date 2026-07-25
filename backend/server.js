import express from 'express';
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js'
import farmerRoutes from './routes/farmer.routes.js'
import workRoutes from './routes/work.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import cookieParser from "cookie-parser";
import cors from 'cors'
import machineRoutes from './routes/machine.route.js';
import expensesRoutes from './routes/expenses.routes.js'
import driverRoutes from "./routes/driver.routes.js"
import rateRoutes from './routes/workRate.routes.js'

dotenv.config();
const app = express();

app.use(express.json());

const port = process.env.PORT || 4000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Parse cookies
app.use(cookieParser());
const allowURL = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://smart-tractor.vercel.app",
  "https://smart-tractor-git-main-gulzar-hussains-projects.vercel.app",
  "https://smart-tractor-i5qkwsxso-gulzar-hussains-projects.vercel.app"
];

app.use(cors({
    origin: allowURL,
    credentials: true
}));


app.get('/', (req, res) => {
    res.status(200).json({ message: "Good to go Chief" });
});
// Routes file
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/machine", machineRoutes);
app.use("/api/work", workRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/earning",farmerRoutes);
app.use("/api/today",farmerRoutes);
app.use("/api/dues",farmerRoutes);
app.use("/api/expenses",expensesRoutes)
app.use("/api/driver",driverRoutes)
app.use("/api/rate",rateRoutes)

// Database 
connectDB();
// start server
app.listen(port, () => {
    console.log(`server ${port}`);
});
