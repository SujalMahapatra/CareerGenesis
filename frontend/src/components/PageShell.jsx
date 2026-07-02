import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackgroundFX from "../components/BackgroundFX";

export const PageShell = ({ children, variant = "app", testId }) => {
  return (
    <div className="relative min-h-screen" data-testid={testId}>
      <BackgroundFX variant={variant} />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageShell;
