import { each, head, isEqual, last } from '@antv/util';
import { IShape } from '../../dependents';
import Element from '../../geometry/element/';
import { LooseObject } from '../../interface';
import { getAngle, getSectorPath } from '../../util/graphics';
import Action from './base';

/**
 * 背景框的 Action
 */
class ActiveRegion extends Action {
  private items: any[];
  private regionPath: IShape;
  /**
   * 显示
   */
  public show() {
    const view = this.context.view;
    const ev = this.context.event;
    const tooltipItems = view.getTooltipItems({
      x: ev.x,
      y: ev.y,
    });

    if (isEqual(tooltipItems, this.items)) {
      // 如果拾取数据同上次相同，则不重复绘制
      return;
    }
    this.items = tooltipItems;
    if (tooltipItems.length) {
      const xField = view.getXScale().field;
      const xValue = tooltipItems[0].data[xField];
      // 根据 x 对应的值查找 elements
      let elements: Element[] = [];
      const geometries = view.geometries;
      each(geometries, (geometry) => {
        const result = geometry.getElementsBy((ele) => {
          const eleData = ele.getData();
          return eleData[xField] === xValue;
        });

        elements = elements.concat(result);
      });

      // 根据 bbox 计算背景框的面积区域
      if (elements.length) {
        const firstBBox = elements[0].shape.getBBox();
        const lastBBox = elements[elements.length - 1].shape.getBBox();
        const groupBBox: LooseObject = firstBBox;
        each(elements, (ele: Element) => {
          const bbox = ele.shape.getBBox();
          groupBBox.x = Math.min(bbox.minX, groupBBox.minX);
          groupBBox.y = Math.min(bbox.minY, groupBBox.minY);
          groupBBox.width = Math.max(bbox.maxX, groupBBox.maxX) - groupBBox.x;
          groupBBox.height = Math.max(bbox.maxY, groupBBox.maxY) - groupBBox.y;
        });

        const { backgroundGroup, coordinateBBox } = view;
        const coordinate = view.getCoordinate();
        let path;
        if (coordinate.isRect) {
          const xScale = view.getXScale();
          const appendRatio = xScale.isLinear ? 0 : 0.25; // 如果 x 轴是数值类型，如直方图，不需要家额外的宽度
          let minX: number;
          let minY: number;
          let width: number;
          let height: number;
          if (coordinate.isTransposed) {
            minX = coordinateBBox.minX;
            minY = lastBBox.minY - appendRatio * lastBBox.height;
            width = coordinateBBox.width;
            height = groupBBox.height + appendRatio * 2 * lastBBox.height;
          } else {
            minX = firstBBox.minX - appendRatio * firstBBox.width;
            minY = coordinateBBox.minY;
            width = groupBBox.width + appendRatio * 2 * firstBBox.width;
            height = coordinateBBox.height;
          }
          path = [
            ['M', minX, minY],
            ['L', minX + width, minY],
            ['L', minX + width, minY + height],
            ['L', minX, minY + height],
            ['Z'],
          ];
        } else {
          const firstElement = head(elements);
          const lastElement = last(elements);
          const { startAngle } = getAngle(firstElement.getModel(), coordinate);
          const { endAngle } = getAngle(lastElement.getModel(), coordinate);
          const center = coordinate.getCenter();
          // @ts-ignore
          const radius = coordinate.getRadius();
          const innterRadius = coordinate.innerRadius * radius;
          path = getSectorPath(center.x, center.y, radius, startAngle, endAngle, innterRadius);
        }

        if (this.regionPath) {
          this.regionPath.attr('path', path);
          this.regionPath.show();
        } else {
          this.regionPath = backgroundGroup.addShape({
            type: 'path',
            name: 'active-region',
            capture: false,
            attrs: {
              path,
              fill: '#CCD6EC',
              opacity: 0.3,
            },
          });
        }
      }
    }
  }
  /**
   * 隐藏
   */
  public hide() {
    if (this.regionPath) {
      this.regionPath.hide();
    }
    // this.regionPath = null;
    this.items = null;
  }
  /**
   * 销毁
   */
  public destroy() {
    this.hide();
    if (this.regionPath) {
      this.regionPath.remove(true);
    }
    super.destroy();
  }
}

export default ActiveRegion;
