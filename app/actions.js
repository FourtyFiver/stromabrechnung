'use server'

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function addPriceConfig(formData) {
    const priceHT = parseFloat(formData.get("priceHT"))
    const priceNT = parseFloat(formData.get("priceNT"))
    const baseFee = parseFloat(formData.get("baseFee")) || 0

    await prisma.priceConfig.create({
        data: {
            priceHT,
            priceNT,
            baseFee,
            validFrom: new Date()
        }
    })

    revalidatePath("/settings")
    revalidatePath("/")
}

export async function addReading(formData) {
    const valueHT = parseFloat(formData.get("valueHT"))
    const valueNT = parseFloat(formData.get("valueNT"))
    const dateStr = formData.get("date")
    const date = dateStr ? new Date(dateStr) : new Date()
    const comment = formData.get("comment")

    await prisma.reading.create({
        data: {
            valueHT,
            valueNT,
            date,
            comment
        }
    })

    revalidatePath("/readings")
    revalidatePath("/")
    redirect("/readings") // Redirect back to list
}
