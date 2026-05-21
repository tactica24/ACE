import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVideosWithoutCreatorProfiles() {
  try {
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            email: true,
            creator: {
              select: {
                id: true,
                creatorNumber: true
              }
            }
          }
        }
      }
    });

    const videosWithoutCreatorProfiles = videos.filter(video => !video.creator.creator);

    console.log(`Total videos: ${videos.length}`);
    console.log(`Videos without creator profiles: ${videosWithoutCreatorProfiles.length}`);

    if (videosWithoutCreatorProfiles.length > 0) {
      console.log('Videos without creator profiles:');
      videosWithoutCreatorProfiles.forEach(video => {
        console.log(`- ${video.title} (${video.id}) - Creator: ${video.creator.email}`);
      });
    } else {
      console.log('All videos have creator profiles.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkVideosWithoutCreatorProfiles().catch(console.error);