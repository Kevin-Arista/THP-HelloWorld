import Link from "next/link";

export default function Home() {
	return (
		<main
			style={{
				minHeight: "calc(100vh - 56px)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "system-ui, sans-serif",
				padding: "2rem",
			}}>
			{/* Hero */}
			<h1
				style={{
					fontSize: "3.5rem",
					fontWeight: 800,
					color: "#f0f0ff",
					textShadow:
						"0 0 7px rgba(78,205,196,0.6), 0 0 30px rgba(78,205,196,0.3)",
					marginBottom: "0.5rem",
					textAlign: "center",
				}}>
				MemeVote
			</h1>
			<p
				style={{
					fontSize: "0.95rem",
					color: "#8888aa",
					marginBottom: "0.25rem",
					textAlign: "center",
					letterSpacing: "0.05em",
				}}>
				Powered by{" "}
				<span
					style={{
						color: "#4ecdc4",
						fontWeight: 600,
						textShadow: "0 0 6px rgba(78,205,196,0.4)",
					}}>
					Cracked AI
				</span>
			</p>
			<p
				style={{
					fontSize: "1.25rem",
					color: "#8888aa",
					marginBottom: "3rem",
					textAlign: "center",
				}}>
				Swipe. Vote. Laugh.
			</p>

			{/* Decorative phone frame */}
			<div
				style={{
					width: "260px",
					height: "420px",
					background: "#16213e",
					borderRadius: "36px",
					border: "3px solid #2a2a4a",
					boxShadow:
						"0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(78,205,196,0.08)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					overflow: "hidden",
					marginBottom: "3rem",
					position: "relative",
				}}>
				{/* Notch */}
				<div
					style={{
						width: "90px",
						height: "24px",
						background: "#1a1a2e",
						borderRadius: "0 0 14px 14px",
					}}
				/>

				{/* Placeholder content inside phone */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "1rem",
						padding: "1.5rem",
					}}>
					<div
						style={{
							width: "180px",
							height: "140px",
							background: "#1a1a2e",
							borderRadius: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "2.5rem",
						}}>
						😂
					</div>
					<div
						style={{
							width: "160px",
							height: "12px",
							background: "#2a2a4a",
							borderRadius: "6px",
						}}
					/>
					<div
						style={{
							width: "120px",
							height: "12px",
							background: "#2a2a4a",
							borderRadius: "6px",
						}}
					/>
					<div
						style={{
							display: "flex",
							gap: "2rem",
							marginTop: "0.5rem",
						}}>
						<span
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "50%",
								border: "2px solid #3a3a5a",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "1.1rem",
								color: "#ff6b6b",
							}}>
							&#x2717;
						</span>
						<span
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "50%",
								border: "2px solid #3a3a5a",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "1.1rem",
								color: "#4ecdc4",
							}}>
							&#x2713;
						</span>
					</div>
				</div>

				{/* Home indicator */}
				<div
					style={{
						width: "90px",
						height: "4px",
						background: "#3a3a5a",
						borderRadius: "2px",
						marginBottom: "8px",
					}}
				/>
			</div>

			{/* CTA Buttons */}
			<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
				<Link
					href="/vote"
					style={{
						padding: "0.85rem 2rem",
						fontSize: "1.05rem",
						fontWeight: 600,
						color: "#1a1a2e",
						background: "#4ecdc4",
						borderRadius: "10px",
						textDecoration: "none",
						boxShadow:
							"0 0 15px rgba(78,205,196,0.4), 0 0 45px rgba(78,205,196,0.2)",
						transition: "transform 0.15s, box-shadow 0.15s",
					}}>
					Start Voting
				</Link>
				<Link
					href="/showcase"
					style={{
						padding: "0.85rem 2rem",
						fontSize: "1.05rem",
						fontWeight: 600,
						color: "#f0f0ff",
						background: "transparent",
						border: "1px solid #4ecdc4",
						borderRadius: "10px",
						textDecoration: "none",
						transition: "background 0.15s",
					}}>
					View Showcase
				</Link>
			</div>
		</main>
	);
}
