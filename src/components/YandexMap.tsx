/**
 * Живая карта Яндекса с тремя площадками.
 *
 * Карта собрана в Конструкторе карт (yandex.ru/map-constructor) и вставлена
 * публичным виджетом: ключ API не нужен. Метки, их подписи и адреса в балунах
 * лежат в самой карте на стороне Яндекса — здесь только её идентификатор.
 *
 * Раньше подписи рисовались поверх виджета, а координаты меток считались
 * вручную в эллиптической проекции Меркатора. Из-за этого карту приходилось
 * держать неподвижной: стоило её потянуть, и подписи уезжали от меток.
 * Конструктор снимает и то и другое.
 */

const MAP_ID =
  "ac16b8d38f1a4771f721ef9d40d2934cb1dd106ccbd47860afcf1c550b45b7dd";

const SRC =
  "https://yandex.ru/map-widget/v1/?" +
  new URLSearchParams({
    um: `constructor:${MAP_ID}`,
    source: "constructor",
    lang: "ru_RU",
  });

export default function YandexMap({
  className,
  style,
  nodeId,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Нода макета, на месте которой стоит карта. */
  nodeId?: string;
}) {
  return (
    <div data-node-id={nodeId} className={className} style={style}>
      <iframe
        src={SRC}
        title="Карта с тремя адресами MyWish в Санкт-Петербурге"
        loading="lazy"
        className="block size-full border-0"
      />
    </div>
  );
}
