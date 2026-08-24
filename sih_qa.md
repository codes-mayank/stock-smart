# SIH Internal Hackathon: Potential Judge Questions & Answers

**Project Name:** Smart Stock (Smart Retail & Inventory Management)

---

### 1. Problem Statement & USP (Unique Selling Proposition)

**Q: What specific problem are you solving with this application?**
**A:** We are addressing the issue of unorganized inventory management and food waste in small to medium retail shops (like Kirana stores). Currently, shopkeepers lack an intuitive, digital way to track inventory, especially expiring items. This leads to financial losses and unnecessary waste. 

**Q: How is your solution different from existing apps like Khatabook or Vyapar?**
**A:** While existing apps focus heavily on accounting and ledger management, "Smart Stock" focuses heavily on **active inventory health**. Our unique features include an automated expiry tracker that dynamically creates combo offers to sell items before they go bad, and an integrated Smart Chat Assistant to give the shopkeeper conversational insights about their stock.

---

### 2. Technical Architecture

**Q: Can you explain your tech stack and why you chose it?**
**A:** 
- **Frontend:** React with Vite and TypeScript for a fast, component-based, and type-safe UI.
- **Backend/Database:** We are using a hybrid database approach. We use **MongoDB** (via Express/Node.js) for structured backend processing and user authentication, and **Firebase Firestore** on the frontend for rapid prototyping, real-time data syncing (like waste impact logging), and seamless integration.

**Q: How are you managing real-time data updates if multiple people access the same shop's inventory?**
**A:** We use Firebase Firestore on the frontend for specific features, which has built-in real-time listener capabilities. For the MongoDB side, our frontend utilizes React Query (`useQuery`), which handles data fetching, caching, and background refetching to ensure the UI stays updated without overwhelming the server.

---

### 3. Key Features Deep-Dive

**Q: How does the auto-remove expired items feature work? Doesn't that create a mismatch with physical stock?**
**A:** The `useAutoRemoveExpired` hook runs checks against the inventory's expiry dates. When an item expires, it is flagged/removed digitally to ensure customers don't see or buy expired goods on the marketplace. The shopkeeper is notified to physically remove the item from the shelf, ensuring the digital and physical realms sync up safely.

**Q: You have an AI/Smart Chat Assistant. How does it work?**
**A:** The Smart Chat Assistant acts as an intelligent co-pilot for the shopkeeper. It contextualizes the shop's current inventory data and helps answer queries like "What is expiring soon?" or "What should I restock?" without the shopkeeper needing to manually dig through tables and charts.

---

### 4. Business & Scalability

**Q: How do you plan to monetize this?**
**A:** Our primary model could be Freemium. Basic inventory and ledger management are free to onboard shopkeepers. Premium features like advanced AI analytics, automated combo-offer generation, and integration into the broader B2B network would require a small monthly subscription. 

**Q: What is the learning curve for a rural shopkeeper?**
**A:** We designed the UI to be extremely visual and intuitive, relying on standard icons and clear color coding (like red for expired, green for safe). In the future, we plan to add vernacular/regional language support to the interface and the Chat Assistant to completely remove the language barrier.

---

### 5. Future Scope & Execution

**Q: What were the biggest challenges you faced while building this?**
**A:** One of the biggest challenges was structuring the data schema to support both local shop management (inventory, credit book) and a public-facing marketplace simultaneously, which is why we adopted our hybrid MongoDB/Firebase approach to balance structural integrity with real-time speed.

**Q: What are your next steps if you get selected for the finale?**
**A:** For the finale, we plan to implement regional language support, a mobile-first Progressive Web App (PWA) layout since most shopkeepers use phones, and integrate SMS/WhatsApp notifications for the Credit Book reminders.
