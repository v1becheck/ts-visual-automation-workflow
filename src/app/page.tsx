import { ReactFlowProvider } from "@xyflow/react";
import AutomationBuilder from "./components/AutomationBuilder";
import { DnDProvider } from "./contexts/DnDContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import styles from "./page.module.css";

const Home = () => {
  return (
    <div className={styles.main}>
      <ThemeProvider>
        <ReactFlowProvider>
          <DnDProvider>
            <AutomationBuilder />
          </DnDProvider>
        </ReactFlowProvider>
      </ThemeProvider>
    </div>
  );
};

export default Home;
