import { handleHint } from '../../utils/tutor/handlers'
import { respond, tutorDeps } from '../../utils/tutor/route'

export default defineEventHandler(async (event) => {
  return respond(event, await handleHint(await readBody(event), await tutorDeps(event)))
})
