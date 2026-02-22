import { ReactFlowProvider } from "@xyflow/react";
import AutomationBuilder from "./components/AutomationBuilder";
import Toast from "./components/Toast";
import { DnDProvider } from "./contexts/DnDContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import styles from "./page.module.css";

const Home = () => {
  return (
    <div className={styles.main}>
      <ThemeProvider>
        <ToastProvider>
          <ReactFlowProvider>
            <DnDProvider>
              <AutomationBuilder />
              <Toast />
            </DnDProvider>
          </ReactFlowProvider>
        </ToastProvider>
      </ThemeProvider>
    </div>
  );
};

export default Home;
