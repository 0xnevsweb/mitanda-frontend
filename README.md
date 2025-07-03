# **MiTanda: Trustless, Borderless Savings Circles for the Onchain Era**  

![MiTanda Logo](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/miTanda_logo.jpg-alJGiI27CW2YaGstyXezgtUYebwOjG.jpeg)  

## **Overview**  
MiTanda revolutionizes traditional rotating savings and credit associations (ROSCAs)—known as *tandas*, *cundinas*, or *susus*—by bringing them fully onchain. Built on **Base L2**, MiTanda eliminates trust issues, geographic barriers, and lack of transparency by leveraging smart contracts for secure, autonomous, and borderless savings circles.  

With over **200 million people** worldwide relying on ROSCAs—and **40% of Latin American adults** participating—MiTanda modernizes this centuries-old financial tool for the blockchain era.  

## **Key Features**  
✅ **Trustless & Secure** – Funds are held in smart contracts, removing reliance on a central "banker."  
✅ **Provably Fair Payouts** – Randomized, onchain-selected payout order ensures fairness.  
✅ **Transparent & Enforceable Rules** – Contributions, missed payments, and penalties are recorded onchain.  
✅ **Borderless Participation** – Join from anywhere with just a mobile wallet—no need to know other participants.  
✅ **Flexible Payments** – Pay in advance, set grace periods, and automate late fees via smart contracts.  
✅ **Onchain Reputation** – Future integration for decentralized creditworthiness based on participation history.  

## **Tech Stack**  
- **Frontend**: Next.js (React)  
- **Smart Contracts**: Solidity (Deployed on **Base L2**)  
- **Onchain Randomness**: Chainlink VRF or equivalent  
- **Wallets**: MetaMask, Coinbase Wallet, etc.  
- **Storage**: IPFS (for metadata, if applicable)  

## **Getting Started**  

### **Prerequisites**  
- Node.js (v18+)  
- Yarn / npm  
- Git  
- A Web3 wallet (e.g., MetaMask)  

### **Installation**  
1. Clone the repository:  
   ```bash
   git clone https://github.com/nextidearly/mitanda-frontend.git
   cd mitanda
   ```
2. Install dependencies:  
   ```bash
   yarn install  # or npm install
   ```
3. Set up environment variables:  
   Create a `.env.local` file and configure:  
   ```env
    NEXT_PUBLIC_ONCHAINKIT_API_KEY=
    NEXT_PUBLIC_TANDA_MANAGER=
    NEXT_PUBLIC_USDC_ADDRESS=
    NEXT_PUBLIC_EXPLORER=https://basescan.org
   ```
4. Run the development server:  
   ```bash
   yarn dev  # or npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.  


## **Contributing**  
We welcome contributions! Please:  
1. Fork the repository.  
2. Create a new branch (`git checkout -b feature/your-feature`).  
3. Commit changes (`git commit -m 'Add some feature'`).  
4. Push to the branch (`git push origin feature/your-feature`).  
5. Open a **Pull Request**.  

## **License**  
MiTanda is **MIT licensed**.  

## **Contact**  
- **Website**: [https://mitanda.org]() 
- **Twitter**: [https://x.com/basednouns]() 

---

### **Why MiTanda?**  
Traditional tandas suffer from:  
❌ **Trust issues** (the "banker" can disappear with funds)  
❌ **Geographic restrictions** (cash-based, in-person exchanges)  
❌ **No transparency** (handwritten logs, verbal agreements)  
❌ **Rigid rules** (miss one payment, lose your spot)  

MiTanda fixes all of this—**bringing community finance into the onchain era.**  

🚀 **Join the future of trustless savings circles today!**