"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	async function handleSignIn() {
		const supabase = createClient();
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
	}

	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				fontFamily: "system-ui, sans-serif",
			}}>
			<h1 style={{ marginBottom: "1.5rem" }}>Sign In</h1>

			{error && (
				<p style={{ color: "red", marginBottom: "1rem" }}>
					Authentication failed. Please try again.
				</p>
			)}

			<button
				onClick={handleSignIn}
				style={{
					padding: "0.75rem 1.5rem",
					fontSize: "1rem",
					backgroundColor: "#4285F4",
					color: "#fff",
					border: "none",
					borderRadius: "8px",
					cursor: "pointer",
				}}>
				Sign in with Google
			</button>
		</main>
	);
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}
