const APP_VERSION = __APP_VERSION__ // eslint-disable-line no-undef

export default function VersionFooter({ className = '' }) {
  return (
    <div className={`text-[10px] text-muted-foreground/60 text-right select-none pointer-events-none ${className}`}>
      RHDTalia v{APP_VERSION}
    </div>
  )
}
