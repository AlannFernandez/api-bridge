# API Bridge 🌉

![Status: Beta](https://img.shields.io/badge/status-beta-yellow)

API Bridge is a powerful, visual integration platform designed to simplify the connection between disparate APIs, orchestrate complex workflows, and transform data with ease. Built with **Next.js**, **React Flow**, and **Tailwind CSS**, it provides a modern "low-code" approach to API orchestration and data bridging.

> **Note:** This project is currently in **Beta**. It is an experimental tool and may undergo significant changes as it evolves. Use in production environments with caution.

## 🚀 The Vision

Modern software ecosystems often suffer from "integration hell"—connecting multiple APIs with different protocols, data formats, and authentication methods usually requires writing significant amounts of boilerplate "glue" code. 

**API Bridge** solves this by providing a visual canvas where integrations are treated as flows. You can drag, drop, and connect nodes to build complex logic, transforming a tedious coding task into a clear, manageable visual diagram.

## ✨ Key Features

- **Visual Flow Editor:** A drag-and-drop interface (powered by XYFlow/React Flow) to design API sequences and logic visually.
- **Multi-protocol Support:** Native handling for both **REST** and **SOAP** services, allowing you to bridge modern and legacy systems.
- **Dynamic Transformation Engine:** 
  - Field mapping with dot-notation support (e.g., `user.profile.id`).
  - Template resolution (e.g., `"User: {{node1.name}}"`).
  - Type casting (String, Number, Boolean, Date).
- **Live Execution & Testing:** Run your flows directly from the browser. Monitor latency, status codes, and response bodies in real-time.
- **Deep Inspection:** Configure every aspect of your API calls—headers, query parameters, route variables, and request bodies—through an intuitive inspector panel.
- **Real-time Logging:** A built-in console for debugging and monitoring every step of your workflow's execution.

## 🏗 Philosophy: Open Core

API Bridge is built on an **Open Core** model. We believe that the fundamental tools for API orchestration and data transformation should be accessible to every developer.

- **The Core:** The visual editor, REST/SOAP support, and transformation engine will always remain open source and free to self-host.
- **The Future:** We plan to introduce a Cloud-hosted version and Enterprise features (such as team collaboration, advanced security audits, and managed deployment) to support the long-term sustainability of the project.

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Visual Engine:** [React Flow (XYFlow)](https://reactflow.dev/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Validation:** [Zod](https://zod.dev/)
- **State Management:** React Hooks & Local Storage

## 💡 Use Cases

### 1. API Orchestration
Sequentially call multiple APIs where one request depends on the output of a previous one (e.g., fetching a user ID from one service to use it in a search request to another).

### 2. Legacy-to-Modern Bridge
Consume data from a legacy **SOAP** service and transform it into a clean, modern **JSON** structure for your frontend or other microservices.

### 3. Data Normalization
Aggregate data from multiple disparate sources and map them into a unified schema, ensuring consistency across your data pipeline.

### 4. Rapid Prototyping
Quickly test integration logic and data transformations without setting up a dedicated backend service or writing complex integration scripts.

## 📈 Boosting Integration Efficiency

API Bridge drastically improves development velocity and operational clarity:

- **Reduced Boilerplate:** No more writing repetitive `fetch` or `axios` calls with nested `.then()` or `try-catch` blocks for every integration.
- **Visual Clarity:** Complex integration logic that would be hard to follow in code becomes self-documenting through the visual graph.
- **Faster Debugging:** The integrated console and real-time execution feedback allow you to identify and fix data mismatches or connectivity issues in seconds.
- **Lower Barrier to Entry:** Enables more team members to contribute to integration tasks without needing deep expertise in specific API protocols or complex transformation logic.

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/api-bridge.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the editor:**
   Navigate to [http://localhost:3000](http://localhost:3000) to start building your first bridge.

---

Built with ❤️ by [Alan Fernandez](mailto:alanfernande8@gmail.com).
