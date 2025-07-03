'use server'
import prisma from '@/lib/prisma'
import { TandaData } from '@/types'

export async function createTanda(tandaData: Omit<TandaData, 'id' | 'createdAt' | 'updatedAt'>) {
    return await prisma.tanda.create({
        data: {
            ...tandaData,
            participants: {
                create: tandaData.participants.map(address => ({ address }))
            }
        },
        include: {
            participants: true
        }
    })
}

export async function getTandaById(id: string) {
    const tanda = await prisma.tanda.findUnique({
        where: { id },
        include: {
            participants: true
        }
    })

    if (!tanda) return null

    return {
        ...tanda,
        participants: tanda.participants.map(p => p.address)
    } as TandaData
}

export async function getTandasByCreator(creatorAddress: string) {
    const tandas = await prisma.tanda.findMany({
        where: { creatorAddress },
        orderBy: { createdAt: 'desc' }
    })

    return tandas as TandaData[]
}

export async function getTandasByParticipant(participantAddress: string) {
    const participantRecords = await prisma.tandaParticipant.findMany({
        where: { address: participantAddress },
        include: {
            tanda: true
        }
    })

    return participantRecords.map(record => record.tanda) as TandaData[]
}

export async function getAllActiveTandas() {
    const tandas = await prisma.tanda.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return tandas as TandaData[]
}

// Get tandas with pagination
export async function getPaginatedTandas(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tandas, total] = await Promise.all([
        prisma.tanda.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.tanda.count()
    ]);

    return {
        data: tandas as TandaData[],
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
}

// Search tandas by title or description
export async function searchTandas(query: string) {
    return await prisma.tanda.findMany({
        where: {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        },
        orderBy: { createdAt: 'desc' }
    }) as TandaData[];
}
