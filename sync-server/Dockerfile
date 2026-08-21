# The service is one file's worth of dependencies, so the image stays small and
# boring on purpose: no build step, no toolchain, nothing to keep patched but
# Node itself.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# --chown matters: the files on the build host are 0660 (that is how this box
# creates them), and COPY preserves the mode — without it the unprivileged
# `node` user cannot read its own application.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src
# The boot-time migration reads schema.sql from the app root.
COPY --chown=node:node schema.sql ./
RUN chmod -R a+rX /app/src /app/package.json /app/schema.sql

# Inside the container the service must listen on all interfaces; the host
# publishes it on loopback only, so this is not an exposure.
ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787

USER node
CMD ["node", "src/index.js"]
