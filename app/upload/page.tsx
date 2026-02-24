"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Stage =
	| "idle"
	| "presigning"
	| "uploading"
	| "registering"
	| "captioning"
	| "success"
	| "error";

type CaptionRecord = {
	id: string;
	content: string;
	[key: string]: unknown;
};

const BASE_URL = "https://api.almostcrackd.ai";
const ACCEPTED_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/heic",
];
const STAGE_LABELS: Partial<Record<Stage, string>> = {
	presigning: "Getting upload URL...",
	uploading: "Uploading image...",
	registering: "Registering image...",
	captioning: "Generating captions...",
};

export default function UploadPage() {
	const supabase = createClient();
	const [user, setUser] = useState<User | null>(null);
	const [authChecked, setAuthChecked] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [stage, setStage] = useState<Stage>("idle");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [captions, setCaptions] = useState<CaptionRecord[]>([]);
	const [cdnUrl, setCdnUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const previewUrlRef = useRef<string | null>(null);

	const isProcessing = ["presigning", "uploading", "registering", "captioning"].includes(stage);

	useEffect(() => {
		supabase.auth.getUser().then(({ data: { user } }) => {
			setUser(user);
			setAuthChecked(true);
		});
	}, [supabase]);

	// Cleanup object URL on unmount
	useEffect(() => {
		return () => {
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current);
			}
		};
	}, []);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = e.target.files?.[0] ?? null;
		// Revoke previous preview URL
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}
		setErrorMsg(null);
		setStage("idle");
		setCaptions([]);
		setCdnUrl(null);
		setCopied(false);

		if (!selected) {
			setFile(null);
			setPreview(null);
			return;
		}

		const isHeic =
			selected.type === "image/heic" ||
			selected.name.toLowerCase().endsWith(".heic");
		const validType = ACCEPTED_TYPES.includes(selected.type) || isHeic;

		if (!validType) {
			setFile(null);
			setPreview(null);
			setErrorMsg(
				`Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, or HEIC image.`,
			);
			setStage("error");
			return;
		}

		const url = URL.createObjectURL(selected);
		previewUrlRef.current = url;
		setFile(selected);
		setPreview(url);
	}

	async function handleUpload() {
		if (!file) return;

		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;

			if (!token) {
				setErrorMsg("Session expired, please sign in again.");
				setStage("error");
				return;
			}

			const authHeaders = {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			};

			// Step 1: Get presigned URL
			setStage("presigning");
			const presignRes = await fetch(`${BASE_URL}/pipeline/generate-presigned-url`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({ contentType: file.type }),
			});
			if (!presignRes.ok) {
				const text = await presignRes.text();
				throw new Error(`Failed to get upload URL: ${text}`);
			}
			const { presignedUrl, cdnUrl: fetchedCdnUrl } = await presignRes.json();
			setCdnUrl(fetchedCdnUrl);

			// Step 2: Upload to S3
			setStage("uploading");
			const uploadRes = await fetch(presignedUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!uploadRes.ok) {
				throw new Error(`Upload failed with status ${uploadRes.status}`);
			}

			// Step 3: Register image
			setStage("registering");
			const registerRes = await fetch(`${BASE_URL}/pipeline/upload-image-from-url`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({ imageUrl: fetchedCdnUrl, isCommonUse: false }),
			});
			if (!registerRes.ok) {
				const text = await registerRes.text();
				throw new Error(`Failed to register image: ${text}`);
			}
			const { imageId } = await registerRes.json();

			// Step 4: Generate captions
			setStage("captioning");
			const captionRes = await fetch(`${BASE_URL}/pipeline/generate-captions`, {
				method: "POST",
				headers: authHeaders,
				body: JSON.stringify({ imageId }),
			});
			if (!captionRes.ok) {
				const text = await captionRes.text();
				throw new Error(`Failed to generate captions: ${text}`);
			}
			const result: CaptionRecord[] = await captionRes.json();

			setCaptions(result);
			setStage("success");
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setErrorMsg(message);
			setStage("error");
		}
	}

	function handleReset() {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}
		setFile(null);
		setPreview(null);
		setStage("idle");
		setErrorMsg(null);
		setCaptions([]);
		setCdnUrl(null);
		setCopied(false);
	}

	if (!authChecked) {
		return (
			<main style={pageStyle}>
				<p style={{ color: "#8888aa", marginTop: "4rem" }}>Loading...</p>
			</main>
		);
	}

	if (!user) {
		return (
			<main style={pageStyle}>
				<p style={{ color: "#8888aa", marginTop: "4rem" }}>
					Please sign in to upload images.
				</p>
			</main>
		);
	}

	async function handleCopy() {
		if (!cdnUrl) return;
		await navigator.clipboard.writeText(cdnUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<main style={pageStyle}>
		<style>{`
			@keyframes loadingSweep {
				0%   { transform: translateX(-100%); }
				100% { transform: translateX(550%); }
			}
		`}</style>
			{/* Hero / instructions */}
			<div style={heroStyle}>
				<h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", fontWeight: 800, color: "#f0f0ff", letterSpacing: "-0.5px" }}>
					Generate Captions for Your Meme
				</h1>
				<p style={{ margin: 0, color: "#8888aa", fontSize: "1rem", maxWidth: "520px", lineHeight: 1.6 }}>
					Upload any image and our AI will generate a set of witty captions for it.
					Your image will be stored in our CDN so you can share or use the link anywhere.
				</p>

				{/* Step pills */}
				<div style={stepsRowStyle}>
					{[
						{ n: "1", label: "Pick an image" },
						{ n: "2", label: "Click Generate" },
						{ n: "3", label: "Get your captions" },
					].map((s) => (
						<div key={s.n} style={stepPillStyle}>
							<span style={stepNumStyle}>{s.n}</span>
							<span style={{ color: "#c0c0e0", fontSize: "0.85rem" }}>{s.label}</span>
						</div>
					))}
				</div>
			</div>

			<div style={cardStyle}>
				{stage === "success" ? (
					<div>
						{/* Uploaded image preview */}
						{cdnUrl && (
							<div style={{ marginBottom: "1.5rem", borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a4a" }}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={cdnUrl}
									alt="Uploaded meme"
									style={{ width: "100%", maxHeight: "320px", objectFit: "contain", display: "block", background: "#0f0f23" }}
								/>
							</div>
						)}

						{/* Captions */}
						<h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#4ecdc4", margin: "1.5rem 0 0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
							Generated Captions
						</h2>
						{captions.length === 0 ? (
							<p style={{ color: "#8888aa" }}>No captions were generated.</p>
						) : (
							<ol style={{ margin: "0 0 1.5rem", padding: "0 0 0 1.25rem" }}>
								{captions.map((c, i) => (
									<li
										key={c.id ?? i}
										style={{
											color: "#f0f0ff",
											marginBottom: "0.75rem",
											lineHeight: 1.6,
											fontSize: "0.95rem",
											paddingLeft: "0.25rem",
										}}>
										{c.content}
									</li>
								))}
							</ol>
						)}

						<button onClick={handleReset} style={primaryButtonStyle}>
							Upload Another
						</button>
					</div>
				) : (
					<>
						<h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#f0f0ff" }}>
							Upload an Image
						</h2>

						{/* File input zone */}
						<label style={dropZoneStyle}>
							<div style={{ pointerEvents: "none", textAlign: "center" }}>
								<div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🖼️</div>
								<span style={{ color: "#c0c0e0", fontSize: "0.9rem", fontWeight: 500 }}>
									{file ? file.name : "Click to select a file"}
								</span>
								<span style={{ display: "block", color: "#8888aa", fontSize: "0.78rem", marginTop: "0.3rem" }}>
									JPEG · PNG · WebP · GIF · HEIC
								</span>
							</div>
							<input
								type="file"
								accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,.heic"
								onChange={handleFileChange}
								disabled={isProcessing}
								style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
							/>
						</label>

						{/* Preview */}
						{preview && (
							<div style={{ margin: "1rem 0", borderRadius: "12px", overflow: "hidden", border: "1px solid #2a2a4a" }}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={preview}
									alt="Preview"
									style={{ width: "100%", maxHeight: "280px", objectFit: "contain", display: "block", background: "#0f0f23" }}
								/>
							</div>
						)}

						{/* Error */}
						{stage === "error" && errorMsg && (
							<p style={{ color: "#ff6b6b", fontSize: "0.875rem", margin: "0.75rem 0", padding: "0.6rem 0.85rem", background: "rgba(255,107,107,0.08)", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.25)" }}>
								{errorMsg}
							</p>
						)}

						{/* Progress */}
						{isProcessing && (
							<div style={{ margin: "1rem 0" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
									<span style={{ color: "#4ecdc4", fontSize: "0.875rem", fontWeight: 600 }}>
										{STAGE_LABELS[stage]}
									</span>
								</div>
								{/* Indeterminate loading bar */}
								<div style={{ width: "100%", height: "5px", background: "#2a2a4a", borderRadius: "999px", overflow: "hidden" }}>
									<div style={{
										height: "100%",
										width: "35%",
										background: "linear-gradient(90deg, transparent, #4ecdc4, #a8f0ec, #4ecdc4, transparent)",
										borderRadius: "999px",
										animation: "loadingSweep 1.5s ease-in-out infinite",
									}} />
								</div>
								{stage === "captioning" && (
									<p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "#8888aa", lineHeight: 1.5 }}>
										The AI is reading your image — this usually takes 15–30 seconds. Hang tight!
									</p>
								)}
							</div>
						)}

						{/* Submit button */}
						<button
							onClick={handleUpload}
							disabled={!file || isProcessing}
							style={{
								...primaryButtonStyle,
								width: "100%",
								marginTop: "1rem",
								opacity: !file || isProcessing ? 0.45 : 1,
								cursor: !file || isProcessing ? "not-allowed" : "pointer",
							}}>
							{isProcessing ? STAGE_LABELS[stage] : "Generate Captions"}
						</button>
					</>
				)}
			</div>
		</main>
	);
}

const pageStyle: React.CSSProperties = {
	minHeight: "100vh",
	background: "#1a1a2e",
	fontFamily: "system-ui, sans-serif",
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	paddingTop: "2.5rem",
	paddingBottom: "4rem",
};

const heroStyle: React.CSSProperties = {
	width: "100%",
	maxWidth: "560px",
	textAlign: "center",
	marginBottom: "2rem",
	padding: "0 1rem",
};

const stepsRowStyle: React.CSSProperties = {
	display: "flex",
	justifyContent: "center",
	gap: "0.75rem",
	marginTop: "1.25rem",
	flexWrap: "wrap",
};

const stepPillStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "0.5rem",
	background: "#16213e",
	border: "1px solid #2a2a4a",
	borderRadius: "999px",
	padding: "0.35rem 0.9rem",
};

const stepNumStyle: React.CSSProperties = {
	width: "20px",
	height: "20px",
	borderRadius: "50%",
	background: "#4ecdc4",
	color: "#0f0f23",
	fontSize: "0.72rem",
	fontWeight: 700,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

const cardStyle: React.CSSProperties = {
	width: "100%",
	maxWidth: "520px",
	background: "#16213e",
	borderRadius: "16px",
	border: "1px solid #2a2a4a",
	padding: "2rem",
	boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
};

const dropZoneStyle: React.CSSProperties = {
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "100%",
	minHeight: "120px",
	border: "2px dashed #3a3a5a",
	borderRadius: "12px",
	background: "#0f0f23",
	cursor: "pointer",
	transition: "border-color 0.2s",
	boxSizing: "border-box",
};

const cdnBoxStyle: React.CSSProperties = {
	background: "#0f0f23",
	border: "1px solid #2a2a4a",
	borderRadius: "10px",
	padding: "0.85rem 1rem",
};

const copyButtonStyle: React.CSSProperties = {
	padding: "0.25rem 0.7rem",
	fontSize: "0.75rem",
	fontWeight: 600,
	color: "#0f0f23",
	background: "#4ecdc4",
	border: "none",
	borderRadius: "5px",
	cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
	padding: "0.7rem 1.5rem",
	fontSize: "0.95rem",
	fontWeight: 700,
	color: "#0f0f23",
	background: "#4ecdc4",
	border: "none",
	borderRadius: "8px",
	cursor: "pointer",
	transition: "opacity 0.2s",
};
