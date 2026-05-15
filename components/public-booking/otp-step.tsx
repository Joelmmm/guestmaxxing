"use client"

import { useState, useRef, useEffect } from "react"
import { Envelope, Spinner, ArrowLeft, ArrowCounterClockwise, ShieldCheck } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

interface OtpStepProps {
  email: string
  firstName: string
  lastName: string
  /** Called once signIn.emailOtp resolves successfully */
  onVerified: (userId: string) => void
  /** Go back to guest-info step */
  onBack: () => void
}

type OtpPhase = "sending" | "entry" | "verifying" | "error"

export function OtpStep({ email, firstName, onVerified, onBack }: OtpStepProps) {
  const [phase, setPhase] = useState<OtpPhase>("sending")
  const [otp, setOtp] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-send OTP when the component mounts
  useEffect(() => {
    sendOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus the OTP input when we enter the entry phase
  useEffect(() => {
    if (phase === "entry") {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [phase])

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  function startCooldown(seconds = 60) {
    setResendCooldown(seconds)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function sendOtp() {
    setPhase("sending")
    setErrorMsg("")

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })

    if (error) {
      setErrorMsg(error.message || "Failed to send verification code. Please try again.")
      setPhase("error")
      return
    }

    setPhase("entry")
    startCooldown(60)
  }

  async function handleVerify() {
    if (otp.length < 6) return
    setPhase("verifying")
    setErrorMsg("")

    const { data, error } = await authClient.signIn.emailOtp({
      email,
      otp,
      // Pass name so Better Auth can populate it on first-time registration
      name: firstName,
    })

    if (error || !data?.user?.id) {
      setErrorMsg(
        error?.message === "Invalid OTP"
          ? "Incorrect code. Please check your email and try again."
          : (error?.message || "Verification failed. Please try again.")
      )
      setPhase("entry")
      setOtp("")
      return
    }

    onVerified(data.user.id)
  }

  // Auto-submit when all 6 digits are entered
  function handleOtpChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    setOtp(digits)
    if (digits.length === 6) {
      // defer to next tick so state updates settle
      setTimeout(() => handleVerify(), 0)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-muted p-3">
          <Envelope className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">We sent a code to</p>
          <p className="font-semibold">{email}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code to verify your email and confirm your reservation.
        </p>
      </div>

      {/* OTP Input + Verify button */}
      <div className="flex flex-col gap-3">
        <Input
          ref={inputRef}
          id="otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => handleOtpChange(e.target.value)}
          disabled={phase === "sending" || phase === "verifying"}
          className="text-center text-2xl tracking-[0.5em] font-mono h-14"
          aria-label="One-time passcode"
        />
        {errorMsg && (
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
        )}
        <Button
          type="button"
          onClick={handleVerify}
          disabled={otp.length < 6 || phase === "sending" || phase === "verifying"}
          className="w-full"
        >
          {phase === "verifying" ? (
            <>
              <Spinner className="animate-spin size-4 mr-2" />
              Verifying…
            </>
          ) : (
            <>
              <ShieldCheck className="size-4 mr-2" />
              Verify code
            </>
          )}
        </Button>
      </div>

      {/* Sending indicator */}
      {phase === "sending" && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="animate-spin size-4" />
          Sending code…
        </div>
      )}


      {/* Resend */}
      {phase === "entry" && (
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>Didn&apos;t receive it?</span>
          {resendCooldown > 0 ? (
            <span className="font-medium text-foreground tabular-nums">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              className="flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              <ArrowCounterClockwise className="size-3.5" />
              Resend
            </button>
          )}
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <ArrowLeft className="size-4" />
        Back to contact details
      </button>
    </div>
  )
}
