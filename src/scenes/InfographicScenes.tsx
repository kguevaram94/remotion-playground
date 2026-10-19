import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Character, CharacterPair} from './Characters';
import {Card, FadeSlide, SceneShell, colors, font, useEnter} from './shared';

export const TitleScene: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 14}});
  const ring = spring({frame: frame - 8, fps, config: {damping: 18}});

  return (
    <AbsoluteFill
      style={{
        fontFamily: font,
        padding: '72px 56px 200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            border: `3px solid ${colors.accent}`,
            opacity: 0.3 * ring,
            transform: `scale(${0.7 + ring * 0.45})`,
          }}
        />
        <div style={{transform: `scale(${scale})`, textAlign: 'center', zIndex: 1}}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.muted,
              marginBottom: 18,
              fontWeight: 700,
            }}
          >
            Sesgo cognitivo
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 86,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: colors.text,
            }}
          >
            {title}
          </h1>
        </div>
      </div>
      <Character mood="think" accent={colors.accent} delay={6} scale={1.05} />
    </AbsoluteFill>
  );
};

export const HypothesisScene: React.FC = () => {
  const enter = useEnter(10);

  return (
    <SceneShell
      label="Escenario"
      character={<Character mood="think" accent={colors.warn} delay={8} />}
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 36px', fontSize: 58, lineHeight: 1.15}}>
          Partes de una hipótesis
        </h2>
      </FadeSlide>
      <FadeSlide delay={8}>
        <Card style={{display: 'flex', gap: 24, alignItems: 'center'}}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              background: `${colors.warn}22`,
              border: `2px solid ${colors.warn}`,
              display: 'grid',
              placeItems: 'center',
              fontSize: 48,
              transform: `scale(${0.85 + enter * 0.15})`,
            }}
          >
            💡
          </div>
          <div>
            <div style={{fontSize: 28, color: colors.muted, marginBottom: 8}}>
              Creencia inicial
            </div>
            <div style={{fontSize: 40, fontWeight: 750, lineHeight: 1.2}}>
              “Los niños de mi comunidad tienen problemas”
            </div>
          </div>
        </Card>
      </FadeSlide>
      <FadeSlide delay={18} style={{marginTop: 28}}>
        <div style={{fontSize: 34, color: colors.muted}}>
          ¿Qué haces a continuación?
        </div>
      </FadeSlide>
    </SceneShell>
  );
};

export const SeekingEvidenceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = [
    {label: 'Noticia que confirma', ok: true, delay: 4},
    {label: 'Informe alineado', ok: true, delay: 14},
    {label: 'Dato contradictorio', ok: false, delay: 24},
  ];

  return (
    <SceneShell
      label="Búsqueda"
      character={
        <Character mood="search" accent={colors.confirm} delay={6} scale={0.95} />
      }
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 28px', fontSize: 52, lineHeight: 1.15}}>
          Buscas evidencias…
          <br />
          <span style={{color: colors.confirm}}>que apoyen tu idea</span>
        </h2>
      </FadeSlide>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        {items.map((item) => {
          const show = spring({
            frame: frame - item.delay,
            fps,
            config: {damping: 14},
          });
          return (
            <div
              key={item.label}
              style={{
                opacity: item.ok ? show : show * 0.55,
                transform: `translateX(${interpolate(show, [0, 1], [item.ok ? -40 : 40, 0])}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                background: colors.panel,
                borderRadius: 22,
                padding: '22px 26px',
                border: `2px solid ${item.ok ? colors.confirm : colors.contradict}44`,
                filter: item.ok ? 'none' : `grayscale(${1 - show * 0.3})`,
              }}
            >
              <span style={{fontSize: 36}}>{item.ok ? '✓' : '✕'}</span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: item.ok ? colors.text : colors.muted,
                  textDecoration: item.ok ? 'none' : 'line-through',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

export const FilterDefinitionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const funnel = useEnter(6);

  return (
    <SceneShell
      label="Definición"
      character={
        <div style={{transform: 'scale(0.88)', transformOrigin: 'bottom center'}}>
          <CharacterPair leftMood="filter" rightMood="worried" />
        </div>
      }
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 32px', fontSize: 48, lineHeight: 1.15}}>
          La mente actúa como un filtro
        </h2>
      </FadeSlide>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 22,
          marginTop: 12,
          opacity: funnel,
        }}
      >
        <Card accent={colors.confirm}>
          <div
            style={{
              fontSize: 22,
              color: colors.confirm,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Entra
          </div>
          <div style={{fontSize: 36, fontWeight: 750, lineHeight: 1.25}}>
            Info que confirma
          </div>
          <div style={{marginTop: 18, display: 'flex', gap: 10}}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 10,
                  borderRadius: 999,
                  background: colors.confirm,
                  opacity: interpolate(frame, [10 + i * 6, 22 + i * 6], [0.2, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              />
            ))}
          </div>
        </Card>

        <Card accent={colors.contradict}>
          <div
            style={{
              fontSize: 22,
              color: colors.contradict,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Se ignora
          </div>
          <div style={{fontSize: 36, fontWeight: 750, lineHeight: 1.25}}>
            Info que contradice
          </div>
          <div
            style={{
              marginTop: 18,
              height: 10,
              borderRadius: 999,
              background: colors.contradict,
              opacity: 0.35,
              transform: `scaleX(${interpolate(frame, [20, 45], [1, 0.25], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
              transformOrigin: 'left center',
            }}
          />
        </Card>
      </div>

      <FadeSlide delay={20} style={{marginTop: 28}}>
        <div style={{fontSize: 30, color: colors.muted, lineHeight: 1.35}}>
          Buscamos y recordamos lo que nos da la razón.
        </div>
      </FadeSlide>
    </SceneShell>
  );
};

export const RelationshipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <SceneShell
      label="Otro ejemplo"
      character={
        <CharacterPair leftMood="open" rightMood="conflict" />
      }
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 28px', fontSize: 48, lineHeight: 1.15}}>
          En una relación difícil
        </h2>
      </FadeSlide>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
        <FadeSlide delay={6}>
          <Card accent={colors.confirm} style={{minHeight: 220}}>
            <div style={{fontSize: 42, marginBottom: 12}}>🙂</div>
            <div style={{fontSize: 32, fontWeight: 750, marginBottom: 10}}>
              Lectura amable
            </div>
            <div style={{fontSize: 26, color: colors.muted, lineHeight: 1.35}}>
              Gestos de cuidado y comprensión
            </div>
          </Card>
        </FadeSlide>
        <FadeSlide delay={14}>
          <Card
            accent={colors.contradict}
            style={{
              minHeight: 220,
              transform: `rotate(${tilt * 2}deg) scale(${1 + tilt * 0.03})`,
              boxShadow: `0 18px 50px rgba(251,113,133,${0.15 + tilt * 0.25})`,
            }}
          >
            <div style={{fontSize: 42, marginBottom: 12}}>😠</div>
            <div style={{fontSize: 32, fontWeight: 750, marginBottom: 10}}>
              Lectura negativa
            </div>
            <div style={{fontSize: 26, color: colors.muted, lineHeight: 1.35}}>
              Solo ves lo que confirma el conflicto
            </div>
          </Card>
        </FadeSlide>
      </div>
    </SceneShell>
  );
};

export const HarmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 10), [-1, 1], [0.92, 1.08]);

  return (
    <SceneShell
      label="Riesgo"
      character={
        <Character mood="worried" accent={colors.warn} delay={8} scale={1.05} />
      }
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 36px', fontSize: 52, lineHeight: 1.15}}>
          Puede ser muy perjudicial
        </h2>
      </FadeSlide>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        {[
          'Decisiones erróneas',
          'Mente cerrada a lo nuevo',
          'Creencias que se refuerzan solas',
        ].map((text, i) => (
          <FadeSlide key={text} delay={6 + i * 10}>
            <Card
              accent={colors.warn}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                transform: i === 1 ? `scale(${pulse})` : undefined,
              }}
            >
              <span style={{fontSize: 34}}>⚠</span>
              <span style={{fontSize: 34, fontWeight: 750}}>{text}</span>
            </Card>
          </FadeSlide>
        ))}
      </div>
    </SceneShell>
  );
};

export const RemedyScene: React.FC = () => {
  return (
    <SceneShell
      label="Antídoto"
      character={<Character mood="open" accent={colors.accent} delay={10} />}
    >
      <FadeSlide>
        <h2 style={{margin: '0 0 32px', fontSize: 50, lineHeight: 1.15}}>
          Busca varias fuentes.
          <br />
          Mantén la mente abierta.
        </h2>
      </FadeSlide>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
        {['Fuente A', 'Fuente B', 'Fuente C'].map((label, i) => (
          <FadeSlide key={label} delay={8 + i * 8}>
            <Card
              accent={i === 1 ? colors.warn : colors.confirm}
              style={{textAlign: 'center', padding: '36px 16px'}}
            >
              <div style={{fontSize: 40, marginBottom: 12}}>
                {i === 0 ? '📰' : i === 1 ? '🔬' : '🗣️'}
              </div>
              <div style={{fontSize: 28, fontWeight: 750}}>{label}</div>
            </Card>
          </FadeSlide>
        ))}
      </div>
      <FadeSlide delay={28} style={{marginTop: 32}}>
        <Card accent={colors.accent}>
          <div style={{fontSize: 32, fontWeight: 750, lineHeight: 1.3}}>
            Prepárate para cambiar de opinión si se da la ocasión.
          </div>
        </Card>
      </FadeSlide>
    </SceneShell>
  );
};
