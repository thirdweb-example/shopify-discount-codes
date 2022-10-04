import React, { useState, useEffect } from "react";
import { ConnectWallet, useUser } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  const user = useUser();

  const [generatedDiscount, setGeneratedDiscount] = useState<string>("");

  async function generateDiscount() {
    try {
      const response = await fetch("/api/generate-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { discountCode } = await response.json();

      setGeneratedDiscount(discountCode);
    } catch (error) {
      console.error(error);
      setGeneratedDiscount("Not eligible for discount");
    }
  }

  // Whenever the `user` is available, call the generateDiscount function.
  useEffect(() => {
    if (user.user?.address) {
      generateDiscount();
    }
  }, [user.user?.address]);

  return (
    <div className={styles.container}>
      <div className={styles.buttonContainer}>
        <ConnectWallet
          auth={{
            loginOptional: false,
          }}
          accentColor="#5204BF"
        />
      </div>

      {generatedDiscount && (
        <p>
          Your discount code is: <strong>{generatedDiscount}</strong>
        </p>
      )}
    </div>
  );
};

export default Home;
